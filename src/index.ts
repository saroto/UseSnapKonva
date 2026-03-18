import Konva from "konva";

export interface UseSnapKonvaSettings {
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

    const stagePos = stage.position();

    if (snapToStageCenter) {
      vertical.push(stagePos.x + (settings.workspacePadding + settings.pageSize.width / 2) * scaleX);
      horizontal.push(stagePos.y + (settings.workspacePadding + settings.pageSize.height / 2) * scaleY);
    }
    if (snapToStageBorders) {
      vertical.push(
        stagePos.x + settings.workspacePadding * scaleX,
        stagePos.x + (settings.workspacePadding + settings.pageSize.width) * scaleX,
      );
      horizontal.push(
        stagePos.y + settings.workspacePadding * scaleY,
        stagePos.y + (settings.workspacePadding + settings.pageSize.height) * scaleY,
      );
    }
    if (snapToShapes) {
      const layers = stage.getChildren();
      layers.forEach((layer) => {
        layer.getChildren().forEach((groupOrShape) => {
          if (
            groupOrShape === e.target ||
            groupOrShape instanceof Konva.Transformer ||
            groupOrShape.name() === "guid-line"
          )
            return;

          const box = groupOrShape.getClientRect({ skipTransform: false });
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
    lineY: number,
  ) => {
    const { guidelineColor, guidelineDash, guideThickness, showGuidelines } =
      settings;
    if (!showGuidelines) return;

    const transform = layer.getAbsoluteTransform().copy();
    const inverse = transform.invert();
    const offset = inverse.point({ x: lineX, y: lineY });

    const stage = layer.getStage();
    const scaleX = stage ? stage.scaleX() : 1;
    const scaleY = stage ? stage.scaleY() : 1;
    const scale = isHorizontal ? scaleY : scaleX;

    const range = 60000 / scale;
    const { x, y } = offset;

    const points = isHorizontal ? [-range, y, range, y] : [x, -range, x, range];

    const line = new Konva.Line({
      points,
      stroke: guidelineColor,
      strokeWidth: guideThickness / scale,
      name: "guid-line",
      dash: guidelineDash ? [4 / scale, 4 / scale] : undefined,
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

  const clearGuidelines = (e: Konva.KonvaEventObject<DragEvent> | Konva.KonvaEventObject<Event>) => {
    const layer = e.target.getLayer();
    if (layer) layer.find(".guid-line").forEach((l) => l.destroy());
  };

  const handleResize = (e: Konva.KonvaEventObject<Event>) => {
    clearGuidelines(e);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    clearGuidelines(e);
    prop.onDragEnd?.(e);
  };

  const handleResizeEnd = (e: Konva.KonvaEventObject<Event>) => {
    clearGuidelines(e);
    prop.onResizeEnd?.(e);
  };

  return { handleDragging, handleDragEnd, handleResize, handleResizeEnd };
}
