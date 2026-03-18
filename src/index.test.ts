import { describe, it, expect, vi, beforeEach } from "vitest";
import Konva from "konva";
import { useSnapKonva } from "./index";

// --- Mock helpers ---

function createMockStage(overrides: Partial<Konva.Stage> = {}) {
  return {
    scaleX: () => 1,
    scaleY: () => 1,
    position: () => ({ x: 0, y: 0 }),
    getChildren: () => [],
    ...overrides,
  } as unknown as Konva.Stage;
}

function createMockLayer(stage: ReturnType<typeof createMockStage>) {
  const children: Konva.Line[] = [];
  return {
    getStage: () => stage,
    getAbsoluteTransform: () => ({
      copy: () => ({
        invert: () => ({
          point: (p: { x: number; y: number }) => p,
        }),
      }),
    }),
    add: vi.fn((line: Konva.Line) => children.push(line)),
    find: vi.fn((selector: string) => {
      if (selector === ".guid-line") {
        return children.filter((c: any) => c._name === "guid-line");
      }
      return [];
    }),
  } as unknown as Konva.Layer;
}

function createMockTarget(
  layer: ReturnType<typeof createMockLayer>,
  stage: ReturnType<typeof createMockStage>,
  opts: {
    absPos?: { x: number; y: number };
    clientRect?: { x: number; y: number; width: number; height: number };
  } = {},
) {
  const pos = { x: opts.absPos?.x ?? 100, y: opts.absPos?.y ?? 100 };
  return {
    getStage: () => stage,
    getLayer: () => layer,
    absolutePosition: vi.fn((newPos?: { x: number; y: number }) => {
      if (newPos) {
        pos.x = newPos.x;
        pos.y = newPos.y;
      }
      return { ...pos };
    }),
    getClientRect: () => ({
      x: opts.clientRect?.x ?? pos.x,
      y: opts.clientRect?.y ?? pos.y,
      width: opts.clientRect?.width ?? 50,
      height: opts.clientRect?.height ?? 50,
    }),
    name: () => "",
  } as unknown as Konva.Node;
}

function createMockLine(name: string) {
  return {
    _name: name,
    destroy: vi.fn(),
    name: () => name,
  } as unknown as Konva.Line;
}

function createDragEvent(
  target: ReturnType<typeof createMockTarget>,
): Konva.KonvaEventObject<DragEvent> {
  return { target } as unknown as Konva.KonvaEventObject<DragEvent>;
}

// --- Tests ---

describe("useSnapKonva", () => {
  describe("returns correct handler functions", () => {
    it("should return all four handlers", () => {
      const result = useSnapKonva();
      expect(result).toHaveProperty("handleDragging");
      expect(result).toHaveProperty("handleDragEnd");
      expect(result).toHaveProperty("handleResize");
      expect(result).toHaveProperty("handleResizeEnd");
      expect(typeof result.handleDragging).toBe("function");
      expect(typeof result.handleDragEnd).toBe("function");
      expect(typeof result.handleResize).toBe("function");
      expect(typeof result.handleResizeEnd).toBe("function");
    });
  });

  describe("default settings", () => {
    it("should work with no arguments", () => {
      expect(() => useSnapKonva()).not.toThrow();
    });

    it("should accept partial settings", () => {
      expect(() => useSnapKonva({ snapRange: 10 })).not.toThrow();
      expect(() =>
        useSnapKonva({ guidelineColor: "red", guidelineDash: false }),
      ).not.toThrow();
    });
  });

  describe("handleDragEnd", () => {
    it("should destroy all guide lines on drag end", () => {
      const stage = createMockStage();
      const guideLine = createMockLine("guid-line");
      const layer = createMockLayer(stage);
      (layer.find as ReturnType<typeof vi.fn>).mockReturnValue([guideLine]);

      const target = createMockTarget(layer, stage);
      const { handleDragEnd } = useSnapKonva();

      handleDragEnd(createDragEvent(target));

      expect(layer.find).toHaveBeenCalledWith(".guid-line");
      expect(guideLine.destroy).toHaveBeenCalled();
    });

    it("should handle missing layer gracefully", () => {
      const stage = createMockStage();
      const target = {
        getStage: () => stage,
        getLayer: () => null,
      } as unknown as Konva.Node;

      const { handleDragEnd } = useSnapKonva();
      expect(() =>
        handleDragEnd(createDragEvent(target)),
      ).not.toThrow();
    });

    it("should invoke onDragEnd callback", () => {
      const onDragEnd = vi.fn();
      const stage = createMockStage();
      const layer = createMockLayer(stage);
      const target = createMockTarget(layer, stage);
      const event = createDragEvent(target);

      const { handleDragEnd } = useSnapKonva({ onDragEnd });
      handleDragEnd(event);

      expect(onDragEnd).toHaveBeenCalledWith(event);
    });
  });

  describe("handleResize", () => {
    it("should destroy all guide lines on resize", () => {
      const stage = createMockStage();
      const guideLine = createMockLine("guid-line");
      const layer = createMockLayer(stage);
      (layer.find as ReturnType<typeof vi.fn>).mockReturnValue([guideLine]);

      const target = createMockTarget(layer, stage);
      const { handleResize } = useSnapKonva();

      handleResize(
        createDragEvent(target) as unknown as Konva.KonvaEventObject<Event>,
      );

      expect(guideLine.destroy).toHaveBeenCalled();
    });
  });

  describe("handleResizeEnd", () => {
    it("should destroy all guide lines on resize end", () => {
      const stage = createMockStage();
      const guideLine = createMockLine("guid-line");
      const layer = createMockLayer(stage);
      (layer.find as ReturnType<typeof vi.fn>).mockReturnValue([guideLine]);

      const target = createMockTarget(layer, stage);
      const { handleResizeEnd } = useSnapKonva();

      handleResizeEnd(
        createDragEvent(target) as unknown as Konva.KonvaEventObject<Event>,
      );

      expect(guideLine.destroy).toHaveBeenCalled();
    });

    it("should invoke onResizeEnd callback", () => {
      const onResizeEnd = vi.fn();
      const stage = createMockStage();
      const layer = createMockLayer(stage);
      const target = createMockTarget(layer, stage);
      const event = createDragEvent(target) as unknown as Konva.KonvaEventObject<Event>;

      const { handleResizeEnd } = useSnapKonva({ onResizeEnd });
      handleResizeEnd(event);

      expect(onResizeEnd).toHaveBeenCalledWith(event);
    });
  });

  describe("handleDragging", () => {
    it("should not throw when stage or layer is missing", () => {
      const target = {
        getStage: () => null,
        getLayer: () => null,
      } as unknown as Konva.Node;

      const { handleDragging } = useSnapKonva();
      expect(() =>
        handleDragging(createDragEvent(target)),
      ).not.toThrow();
    });

    it("should snap to vertical stage center when within snap range", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Default pageSize is 800x600, workspacePadding is 1500
      // Stage center X = 0 + (1500 + 800/2) * 1 = 1900
      // Stage center Y = 0 + (1500 + 600/2) * 1 = 1800
      // Position the target so its left edge (clientRect.x) is within snapRange of 1900
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1898, y: 500 },
        clientRect: { x: 1898, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva();
      handleDragging(createDragEvent(target));

      // Should have snapped: absolutePosition called with adjusted x
      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      expect(lastCall[0].x).toBe(1900); // snapped to center
    });

    it("should snap to horizontal stage center when within snap range", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Stage center Y = 1800
      const target = createMockTarget(layer, stage, {
        absPos: { x: 500, y: 1797 },
        clientRect: { x: 500, y: 1797, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva();
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      expect(lastCall[0].y).toBe(1800);
    });

    it("should NOT snap when outside snap range", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Stage center X = 1900, place target far from any snap point
      const target = createMockTarget(layer, stage, {
        absPos: { x: 100, y: 100 },
        clientRect: { x: 100, y: 100, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva();
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(100); // unchanged
      expect(lastCall[0].y).toBe(100); // unchanged
    });

    it("should snap to stage border", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Left border X = workspacePadding * scaleX = 1500
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1502, y: 100 },
        clientRect: { x: 1502, y: 100, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva();
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(1500);
    });

    it("should snap to other shapes", () => {
      const otherShape = {
        name: () => "rect1",
        getClientRect: () => ({ x: 200, y: 200, width: 60, height: 60 }),
      };

      const mockLayer = {
        getChildren: () => [otherShape],
      };

      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [mockLayer] as any,
      });
      const layer = createMockLayer(stage);

      // Other shape left edge at x=200. Place target left edge near 200.
      const target = createMockTarget(layer, stage, {
        absPos: { x: 202, y: 500 },
        clientRect: { x: 202, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        snapToStageCenter: false,
        snapToStageBorders: false,
        snapToShapes: true,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(200); // snapped to other shape left edge
    });

    it("should not snap to itself", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
      });
      const layer = createMockLayer(stage);
      const target = createMockTarget(layer, stage, {
        absPos: { x: 100, y: 100 },
        clientRect: { x: 100, y: 100, width: 50, height: 50 },
      });

      // Make the stage return the target itself as a child shape
      const mockLayer = { getChildren: () => [target] };
      (stage as any).getChildren = () => [mockLayer];

      const { handleDragging } = useSnapKonva({
        snapToStageCenter: false,
        snapToStageBorders: false,
        snapToShapes: true,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      // Should remain unchanged since the only shape is itself
      expect(lastCall[0].x).toBe(100);
      expect(lastCall[0].y).toBe(100);
    });

    it("should not snap to Transformer nodes", () => {
      const transformer = Object.create(Konva.Transformer.prototype);
      transformer.name = () => "transformer";
      transformer.getClientRect = () => ({
        x: 102,
        y: 102,
        width: 60,
        height: 60,
      });

      const mockLayer = { getChildren: () => [transformer] };
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [mockLayer] as any,
      });
      const layer = createMockLayer(stage);

      const target = createMockTarget(layer, stage, {
        absPos: { x: 100, y: 100 },
        clientRect: { x: 100, y: 100, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        snapToStageCenter: false,
        snapToStageBorders: false,
        snapToShapes: true,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(100);
      expect(lastCall[0].y).toBe(100);
    });

    it("should not snap to guid-line nodes", () => {
      const guidLine = {
        name: () => "guid-line",
        getClientRect: () => ({ x: 102, y: 102, width: 1, height: 5000 }),
      };

      const mockLayer = { getChildren: () => [guidLine] };
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [mockLayer] as any,
      });
      const layer = createMockLayer(stage);

      const target = createMockTarget(layer, stage, {
        absPos: { x: 100, y: 100 },
        clientRect: { x: 100, y: 100, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        snapToStageCenter: false,
        snapToStageBorders: false,
        snapToShapes: true,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(100);
    });

    it("should destroy old guide lines before creating new ones", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const oldLine = createMockLine("guid-line");
      const layer = createMockLayer(stage);
      (layer.find as ReturnType<typeof vi.fn>).mockReturnValue([oldLine]);

      const target = createMockTarget(layer, stage, {
        absPos: { x: 1898, y: 500 },
        clientRect: { x: 1898, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva();
      handleDragging(createDragEvent(target));

      expect(oldLine.destroy).toHaveBeenCalled();
    });

    it("should create guide lines when snapping occurs and showGuidelines is true", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Snap to stage center X=1900
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1898, y: 500 },
        clientRect: { x: 1898, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({ showGuidelines: true });
      handleDragging(createDragEvent(target));

      expect(layer.add).toHaveBeenCalled();
    });

    it("should NOT create guide lines when showGuidelines is false", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      const target = createMockTarget(layer, stage, {
        absPos: { x: 1898, y: 500 },
        clientRect: { x: 1898, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({ showGuidelines: false });
      handleDragging(createDragEvent(target));

      expect(layer.add).not.toHaveBeenCalled();
    });
  });

  describe("custom settings", () => {
    it("should respect custom snapRange", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Stage center X = 1900, target at 1892 (diff = 8)
      // Default snapRange is 5, so it won't snap
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1892, y: 500 },
        clientRect: { x: 1892, y: 500, width: 50, height: 50 },
      });

      const { handleDragging: handleDefault } = useSnapKonva({ snapRange: 5 });
      handleDefault(createDragEvent(target));

      let calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      let lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(1892); // NOT snapped

      // Now with snapRange=10, it should snap
      (target.absolutePosition as ReturnType<typeof vi.fn>).mockClear();
      (target.absolutePosition as ReturnType<typeof vi.fn>).mockImplementation(
        (newPos?: { x: number; y: number }) => {
          if (newPos) return newPos;
          return { x: 1892, y: 500 };
        },
      );
      (target as any).getClientRect = () => ({
        x: 1892,
        y: 500,
        width: 50,
        height: 50,
      });

      const { handleDragging: handleWide } = useSnapKonva({ snapRange: 10 });
      handleWide(createDragEvent(target));

      calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock.calls;
      lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(1900); // snapped
    });

    it("should respect snapToStageCenter: false", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Near stage center but center snapping disabled
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1898, y: 500 },
        clientRect: { x: 1898, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        snapToStageCenter: false,
        snapToStageBorders: false,
        snapToShapes: false,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(1898); // NOT snapped
    });

    it("should snap to center of target (not just left edge)", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Stage center X = 1900
      // Target width = 100, center = x + 50
      // If target x = 1848, center = 1898, diff = 2 < snapRange(5)
      // Snap should move target so center aligns: new x = absPos.x + (1900 - 1898) = 1850
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1848, y: 500 },
        clientRect: { x: 1848, y: 500, width: 100, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        snapToStageBorders: false,
        snapToShapes: false,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(1850);
    });

    it("should use custom pageSize for center calculation", () => {
      const stage = createMockStage({
        position: () => ({ x: 0, y: 0 }),
        getChildren: () => [] as any,
      });
      const layer = createMockLayer(stage);

      // Custom page: 1000x800, padding 1500
      // Center X = 0 + (1500 + 500) * 1 = 2000
      const target = createMockTarget(layer, stage, {
        absPos: { x: 1998, y: 500 },
        clientRect: { x: 1998, y: 500, width: 50, height: 50 },
      });

      const { handleDragging } = useSnapKonva({
        pageSize: { width: 1000, height: 800 },
        snapToStageBorders: false,
        snapToShapes: false,
      });
      handleDragging(createDragEvent(target));

      const calls = (target.absolutePosition as ReturnType<typeof vi.fn>).mock
        .calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].x).toBe(2000);
    });
  });
});
