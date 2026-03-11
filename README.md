# use-snapping-konva

![npm version](https://img.shields.io/npm/v/use-snapping-konva)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
<!-- > **Note:** Replace this block quote with an image or GIF of your UI elements snapping to alignment guides! -->
A lightweight TypeScript utility for [Konva.js](https://konvajs.org/) that adds smart snapping and visual guidelines when dragging or resizing shapes on a canvas.

## Features

- Snap shapes to the **stage center**, **stage borders**, and **other shapes**
- Snap to left edge, center, and right edge (horizontal) and top, center, and bottom edges (vertical)
- Customizable **visual snap guidelines** with configurable color, thickness, and dash style
- Works with any Konva stage — no framework required
- Full TypeScript support

## Installation

```bash
npm install use-snapping-konva
```

> **Peer dependency:** `konva >= 8.0.0` must be installed in your project.

## Usage

```ts
import Konva from "konva";
import { useSnapKonva } from "use-snapping-konva";

const { handleDragging, handleDragEnd, handleResize, handleResizeEnd } = useSnapKonva({
  snapRange: 8,
  guidelineColor: "#00dc82",
  snapToStageCenter: true,
  snapToStageBorders: true,
  snapToShapes: true,
  pageSize: { width: 1920, height: 1080 },
  workspacePadding: 1500,
});

// Attach to a draggable shape
shape.on("dragmove", handleDragging);
shape.on("dragend", handleDragEnd);

// Attach to a Konva.Transformer for resize snapping
transformer.on("transform", handleResize);
transformer.on("transformend", handleResizeEnd);
```

## API

### `useSnapKonva(settings?)`

Returns an object with four event handlers to attach to Konva nodes.

| Handler | Konva event | Description |
|---|---|---|
| `handleDragging` | `dragmove` | Calculates snapping and draws guidelines while dragging |
| `handleDragEnd` | `dragend` | Clears all guidelines after a drag ends |
| `handleResize` | `transform` | Clears guidelines during a resize |
| `handleResizeEnd` | `transformend` | Clears all guidelines after a resize ends |

### Settings

All settings are optional. Defaults are shown below.

| Option | Type | Default | Description |
|---|---|---|---|
| `snapRange` | `number` | `5` | Distance in pixels within which snapping activates |
| `guidelineColor` | `string` | `"#00dc82"` | Color of the snap guideline |
| `guidelineDash` | `boolean` | `true` | Whether the guideline is dashed |
| `showGuidelines` | `boolean` | `true` | Whether to draw guidelines at all |
| `guideThickness` | `number` | `1` | Stroke width of the guideline |
| `snapToStageCenter` | `boolean` | `true` | Snap to the center of the page |
| `snapToStageBorders` | `boolean` | `true` | Snap to the edges of the page |
| `snapToShapes` | `boolean` | `true` | Snap to edges and centers of other shapes |
| `pageSize` | `{ width, height }` | `{ width: 800, height: 600 }` | The logical page dimensions |
| `workspacePadding` | `number` | `1500` | Padding around the page within the stage |

## License

MIT © Kimsinh Seang

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments

This project was inspired by and adapted from the excellent [use-konva-snapping](https://github.com/faridmth/use-konva-snapping) by Farid.