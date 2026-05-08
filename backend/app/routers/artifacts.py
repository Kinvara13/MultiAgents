"""Artifact management API routes.

Provides endpoints for listing, retrieving, downloading, and reviewing
artifacts produced during workflow and agent executions.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Artifact
from app.schemas import (
    ArtifactContentResponse,
    ArtifactListResponse,
    ArtifactResponse,
    ArtifactReviewRequest,
    ArtifactReviewResponse,
)

router = APIRouter(prefix="/api/v1", tags=["artifacts"])


@router.get(
    "/artifacts",
    response_model=ArtifactListResponse,
    summary="List artifacts",
    description="Retrieve a paginated list of artifacts with optional filtering.",
)
async def list_artifacts(
    run_id: Optional[str] = Query(None, description="Filter by workflow run ID"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    mime_type: Optional[str] = Query(None, description="Filter by MIME type"),
    search: Optional[str] = Query(None, description="Search artifact names"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    db: AsyncSession = Depends(get_db),
) -> ArtifactListResponse:
    """List artifacts with optional filtering and pagination.

    Args:
        run_id: Filter by associated workflow run.
        agent_id: Filter by producing agent.
        mime_type: Filter by MIME type (e.g., 'text/plain', 'image/png').
        search: Free-text search across artifact names.
        skip: Pagination offset.
        limit: Pagination page size.
        db: Database session.

    Returns:
        Paginated list of artifacts with total count.
    """
    query = select(Artifact).where(Artifact.is_deleted.is_(False))

    if run_id:
        query = query.where(Artifact.workflow_run_id == run_id)
    if agent_id:
        query = query.where(Artifact.agent_id == agent_id)
    if mime_type:
        query = query.where(Artifact.mime_type == mime_type)
    if search:
        query = query.where(
            Artifact.name.ilike(f"%{search}%")
            | Artifact.description.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(Artifact.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return ArtifactListResponse(
        items=list(items),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/artifacts/{id}",
    response_model=ArtifactResponse,
    summary="Get artifact",
    description="Retrieve a single artifact by its ID.",
)
async def get_artifact(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> Artifact:
    """Get an artifact by ID.

    Args:
        id: The artifact's unique identifier.
        db: Database session.

    Returns:
        The requested artifact.

    Raises:
        HTTPException: 404 if artifact not found.
    """
    result = await db.execute(
        select(Artifact).where(Artifact.id == id, Artifact.is_deleted.is_(False))
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact '{id}' not found",
        )
    return artifact


@router.get(
    "/artifacts/{id}/content",
    response_model=ArtifactContentResponse,
    summary="Get artifact content",
    description="Retrieve the raw content of an artifact.",
)
async def get_artifact_content(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> ArtifactContentResponse:
    """Get the content of an artifact by ID.

    Args:
        id: The artifact's unique identifier.
        db: Database session.

    Returns:
        Artifact content with metadata.

    Raises:
        HTTPException: 404 if artifact not found.
    """
    result = await db.execute(
        select(Artifact).where(Artifact.id == id, Artifact.is_deleted.is_(False))
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact '{id}' not found",
        )

    content = artifact.content or ""
    if artifact.storage_path and not content:
        content = f"[Content stored at: {artifact.storage_path}]"

    return ArtifactContentResponse(
        id=artifact.id,
        name=artifact.name,
        mime_type=artifact.mime_type,
        content=content,
        size_bytes=artifact.size_bytes,
        encoding=artifact.encoding or "utf-8",
    )


@router.get(
    "/artifacts/{id}/download",
    summary="Download artifact",
    description="Download an artifact as a file attachment.",
)
async def download_artifact(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Download an artifact as a file attachment.

    Args:
        id: The artifact's unique identifier.
        db: Database session.

    Returns:
        File response with appropriate Content-Disposition header.

    Raises:
        HTTPException: 404 if artifact not found.
    """
    result = await db.execute(
        select(Artifact).where(Artifact.id == id, Artifact.is_deleted.is_(False))
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact '{id}' not found",
        )

    content = artifact.content or ""
    if artifact.storage_path and not content:
        content = f"[Content stored at: {artifact.storage_path}]"

    # Determine filename
    filename = artifact.name or f"artifact-{id}"
    if artifact.mime_type:
        ext = artifact.mime_type.split("/")[-1]
        if not filename.endswith(f".{ext}"):
            filename = f"{filename}.{ext}"

    from fastapi.responses import PlainTextResponse

    return PlainTextResponse(
        content=content,
        media_type=artifact.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post(
    "/artifacts/{id}/review",
    response_model=ArtifactReviewResponse,
    summary="Submit artifact review",
    description="Submit a review (approval, rejection, or feedback) for an artifact.",
)
async def submit_review(
    id: str,
    request: ArtifactReviewRequest,
    db: AsyncSession = Depends(get_db),
) -> ArtifactReviewResponse:
    """Submit a review for an artifact.

    Args:
        id: The artifact's unique identifier.
        request: Review payload with decision and optional feedback.
        db: Database session.

    Returns:
        Review submission confirmation.

    Raises:
        HTTPException: 404 if artifact not found, 400 if review decision is invalid.
    """
    result = await db.execute(
        select(Artifact).where(Artifact.id == id, Artifact.is_deleted.is_(False))
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact '{id}' not found",
        )

    if request.decision not in ("approved", "rejected", "needs_revision"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review decision: {request.decision}. "
            "Must be one of: approved, rejected, needs_revision",
        )

    # Store review metadata on the artifact
    review_metadata = artifact.review_metadata or {}
    review_metadata["latest_review"] = {
        "decision": request.decision,
        "feedback": request.feedback,
        "reviewed_by": request.reviewed_by,
        "reviewed_at": datetime.utcnow().isoformat(),
    }
    review_metadata["review_history"] = review_metadata.get("review_history", [])
    review_metadata["review_history"].append(review_metadata["latest_review"])
    artifact.review_metadata = review_metadata

    await db.commit()
    await db.refresh(artifact)

    return ArtifactReviewResponse(
        artifact_id=id,
        decision=request.decision,
        feedback=request.feedback,
        reviewed_by=request.reviewed_by,
        reviewed_at=datetime.utcnow(),
        message=f"Artifact marked as {request.decision}",
    )
