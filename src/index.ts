import Konva from "konva";

interface UseSnapKonvaSettings {
    snapRange: number;
    guidelineColor: string;
    guidelineDash: boolean;
    showGuidelines: boolean;
    guideThickness: number;
    snapToStageCenter: boolean;
    snapToStageBorders: boolean;
    snapToShapes: boolean;
    pageSize: { width: number; height: number };
    workspacePadding: number;
    onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onResizeEnd?: (e: Konva.KonvaEventObject<Event>) => void;
}

export function useSnapKonva(prop: Partial<UseSnapKonvaSettings> = {}) {
  const settings: UseSnapKonvaSettings = {
    snapRange: prop.snapRange ?? 5,
    guidelineColor: prop.guidelineColor ?? "#00dc82",
    guidelineDash: prop.guidelineDash ?? true,
    showGuidelines: prop.showGuidelines ?? true,
    guideThickness: prop.guideThickness ?? 1,
    snapToStageCenter: prop.snapToStageCenter ?? true,
    snapToStageBorders: prop.snapToStageBorders ?? true,
    snapToShapes: prop.snapToShapes ?? true,
    pageSize: prop.pageSize ?? { width: 800, height: 600 },
    workspacePadding: prop.workspacePadding ?? 1500,
  };

  const getSnappingPoints = (
    e: Konva.KonvaEventObject<DragEvent> | Konva.KonvaEventObject<Event>,
  ) => {
    const { snapToStageCenter, snapToShapes, snapToStageBorders } = settings;
    const stage = e.target.getStage();
    const vertical: number[] = [];
    const horizontal: number[] = [];
    if (!stage) return { vertical: [], horizontal: [] };

    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();

    if (snapToStageCenter) {
        
    const stagePos = stage.position();
    vertical.push(stagePos.x + (settings.workspacePadding + settings.pageSize.width / 2) * scaleX);
    horizontal.push(stagePos.y + (settings.workspacePadding + settings.pageSize.height / 2) * scaleY);
    }
    if (snapToStageBorders) {
    
      horizontal.push(
        settings.workspacePadding * scaleY,
        (settings.workspacePadding + settings.pageSize.height) * scaleY,
      );
      vertical.push(
        settings.workspacePadding * scaleX,
        (settings.workspacePadding + settings.pageSize.width) * scaleX,
      );
    }
    if (snapToShapes) {

      // Using a recursive search for all shapes/groups usually works well if we filter out the current one
      // But let's stick to iterating layers as per original intent but safer.
      const layers = stage.getChildren();
      layers.forEach((layer) => {
        layer.getChildren().forEach((groupOrShape) => {
          // Don't snap to itself or the transformer
          if (
            groupOrShape === e.target ||
            groupOrShape instanceof Konva.Transformer ||
            groupOrShape.name() === "guid-line"
          )
            return;

          // Also don't snap to the object being dragged if it's a parent of this shape?
          // e.target IS the object being dragged.

          const box = groupOrShape.getClientRect({ skipTransform: false });
          // Note: getClientRect is relative to stage if not specified,
          // but we need them in absolute stage coordinates.
          // vertical/horizontal arrays store absolute coordinates.

          vertical.push(box.x, box.x + box.width / 2, box.x + box.width);
          horizontal.push(box.y, box.y + box.height / 2, box.y + box.height);
        });
      });
    }
    return {
      vertical: [...new Set(vertical)],
      horizontal: [...new Set(horizontal)],
    };
  };

  const createLine = (
    layer: Konva.Layer,
    isHorizontal: boolean,
    lineX: number,
    LineY: number,
  ) => {
    const { guidelineColor, guidelineDash, guideThickness, showGuidelines } =
      settings;
    if (!showGuidelines) return;

    const transform = layer.getAbsoluteTransform().copy();
    const inverse = transform.invert();

    // Transform the point using inverse transform to get local coordinates
    const offset = inverse.point({ x: Number(lineX), y: Number(LineY) });

    // Get scale to adjust thickness so it looks constant
    const stage = layer.getStage();
    const scaleX = stage ? stage.scaleX() : 1;
    const scaleY = stage ? stage.scaleY() : 1;

    // Use a large range (relative to scale) so it covers the viewport
    // Increase range significantly because local coordinates can be very large if zoomed out
    const range = 60000 / scaleX;

    const x = offset.x;
    const y = offset.y;

    const points = isHorizontal ? [-range, y, range, y] : [x, -range, x, range];

    const line = new Konva.Line({
      points,
      stroke: guidelineColor,
      strokeWidth: guideThickness / scaleX,
      name: "guid-line",
      dash: guidelineDash ? [4 / scaleX, 4 / scaleX] : undefined,
      listening: false,
    });
    layer.add(line);
  };

  // --- Handlers ---
  const handleDragging = (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    const layer = target.getLayer();
    const stage = target.getStage();
    if (!layer || !stage) return;

    layer.find(".guid-line").forEach((l) => l.destroy());

    const { vertical, horizontal } = getSnappingPoints(e);
    const absPos = target.absolutePosition();
    const box = target.getClientRect(); // Absolute client rect of the target

    // Calculate offsets correctly
    // We want to find the minimal shift to align one of standard points (left, center, right) to a breakpoint.

    const { snapRange } = settings;
    let newPos = { x: absPos.x, y: absPos.y };

    // X Snapping
    let minDiffX = snapRange + 1;
    let snappedX: number | null = null;
    let lineX: number | null = null;

    vertical.forEach((breakPoint) => {
      // Left
      const diffLeft = breakPoint - box.x;
      if (Math.abs(diffLeft) < snapRange && Math.abs(diffLeft) < minDiffX) {
        minDiffX = Math.abs(diffLeft);
        snappedX = absPos.x + diffLeft;
        lineX = breakPoint;
      }
      // Center
      const diffCenter = breakPoint - (box.x + box.width / 2);
      if (Math.abs(diffCenter) < snapRange && Math.abs(diffCenter) < minDiffX) {
        minDiffX = Math.abs(diffCenter);
        snappedX = absPos.x + diffCenter;
        lineX = breakPoint;
      }
      // Right
      const diffRight = breakPoint - (box.x + box.width);
      if (Math.abs(diffRight) < snapRange && Math.abs(diffRight) < minDiffX) {
        minDiffX = Math.abs(diffRight);
        snappedX = absPos.x + diffRight;
        lineX = breakPoint;
      }
    });

    if (snappedX !== null && lineX !== null) {
      newPos.x = snappedX;
      createLine(layer, false, lineX, 0);
    }

    // Y Snapping
    let minDiffY = snapRange + 1;
    let snappedY: number | null = null;
    let lineY: number | null = null;

    horizontal.forEach((breakPoint) => {
      // Top
      const diffTop = breakPoint - box.y;
      if (Math.abs(diffTop) < snapRange && Math.abs(diffTop) < minDiffY) {
        minDiffY = Math.abs(diffTop);
        snappedY = absPos.y + diffTop;
        lineY = breakPoint;
      }
      // Center
      const diffCenter = breakPoint - (box.y + box.height / 2);
      if (Math.abs(diffCenter) < snapRange && Math.abs(diffCenter) < minDiffY) {
        minDiffY = Math.abs(diffCenter);
        snappedY = absPos.y + diffCenter;
        lineY = breakPoint;
      }
      // Bottom
      const diffBottom = breakPoint - (box.y + box.height);
      if (Math.abs(diffBottom) < snapRange && Math.abs(diffBottom) < minDiffY) {
        minDiffY = Math.abs(diffBottom);
        snappedY = absPos.y + diffBottom;
        lineY = breakPoint;
      }
    });

    if (snappedY !== null && lineY !== null) {
      newPos.y = snappedY;
      createLine(layer, true, 0, lineY);
    }

    target.absolutePosition(newPos);
  };

  // Placeholder for resize if needed, but for now we focus on dragging as requested.
  // The previous implementation was throwing errors and had complex logic for anchors.
  // We clean up lines at least.
  const handleResize = (e: Konva.KonvaEventObject<DragEvent>) => {
    const layer = e.target.getLayer();

    if (layer) layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const layer = e.target.getLayer();
    if (layer) layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleResizeEnd = (e: Konva.KonvaEventObject<Event>) => {
    const layer = e.target.getLayer();
    if (layer) layer.find(".guid-line").forEach((l) => l.destroy());
  };

  return { handleDragging, handleDragEnd, handleResize, handleResizeEnd };
}
