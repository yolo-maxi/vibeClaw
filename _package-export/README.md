# agentation

Agentation is a visual feedback tool for web apps. Click elements to annotate them, then either copy to clipboard or send to an API for automated processing.

**This fork adds:**
- 🌐 **API Mode** – Send annotations to a backend instead of clipboard
- 👥 **Multiplayer** – See annotations from other users in real-time
- ⚡ **Auto-processing** – Integrate with Claude CLI for automated feedback handling
- 🏷️ **Status tracking** – Track annotation lifecycle (pending → processing → done)

> Original [agentation](https://github.com/benjitaylor/agentation) by Benji Taylor. API mode and multiplayer by Clawdbot team.

## Install

```bash
npm install agentation
```

## Basic Usage (Clipboard Mode)

```tsx
import { Agentation } from 'agentation';

function App() {
  return (
    <>
      <YourApp />
      <Agentation />
    </>
  );
}
```

Click the toolbar in the bottom-right corner, then click any element to annotate it. Copy button generates markdown output for your AI coding agent.

## API Mode

Send annotations to a backend API instead of clipboard:

```tsx
import { Agentation, type Annotation } from 'agentation';

function App() {
  const handleSend = async (annotations: Annotation[]) => {
    const results = await Promise.all(
      annotations.map(async (a) => {
        const res = await fetch('https://your-api.com/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editToken: 'your-token', annotation: a }),
        });
        const { id } = await res.json();
        return { id: a.id, remoteId: id, success: true };
      })
    );
    return results;
  };

  return (
    <Agentation
      apiMode
      apiEndpoint="https://your-api.com"
      editToken="your-edit-token"
      onSend={handleSend}
      pollInterval={20000}
    />
  );
}
```

## Multiplayer Mode

Enable real-time visibility of all annotations in a project:

```tsx
<Agentation
  apiMode
  apiEndpoint="https://your-api.com"
  editToken="your-edit-token"
  onSend={handleSend}
  multiplayerMode      // Shows toggle button
  defaultMultiplayer   // Enable by default
/>
```

When multiplayer is on:
- See annotations from all users on the same project
- Each user gets a unique color
- Click remote annotations to view details
- Status updates sync in real-time

## Props

### Basic Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onAnnotationAdd` | `(annotation) => void` | - | Called when annotation created |
| `onAnnotationDelete` | `(annotation) => void` | - | Called when annotation deleted |
| `onAnnotationUpdate` | `(annotation) => void` | - | Called when annotation edited |
| `onAnnotationsClear` | `(annotations[]) => void` | - | Called when all cleared |
| `onCopy` | `(markdown: string) => void` | - | Callback with markdown output |
| `copyToClipboard` | `boolean` | `true` | Write to clipboard on copy |

### API Mode Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiMode` | `boolean` | `false` | Enable API mode |
| `apiEndpoint` | `string` | - | API base URL |
| `editToken` | `string` | - | User's edit token |
| `onSend` | `(annotations) => Promise<SendResult[]>` | - | Send handler |
| `onStatusChange` | `(annotation) => void` | - | Called on status update |
| `pollInterval` | `number` | `20000` | Polling interval (ms) |
| `multiplayerMode` | `boolean` | `false` | Show multiplayer toggle |
| `defaultMultiplayer` | `boolean` | `false` | Default multiplayer state |

## Types

```typescript
type Annotation = {
  id: string;
  x: number;                    // % of viewport width
  y: number;                    // px from top
  comment: string;
  element: string;
  elementPath: string;
  timestamp: number;
  
  // Optional metadata
  selectedText?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  nearbyText?: string;
  cssClasses?: string;
  fullPath?: string;
  
  // API mode fields
  status?: 'draft' | 'pending' | 'processing' | 'completed' | 'interrupted' | 'failed' | 'rejected';
  remoteId?: string;
  tokenOwner?: string;
  imageData?: string;  // Base64 for pasted images
};

type SendResult = {
  id: string;       // Local annotation ID
  remoteId: string; // Server-assigned ID
  success: boolean;
  error?: string;
};
```

## Backend

For API mode, you need a backend. Use [agentation-flow-api](https://github.com/yolo-maxi/agentation-api):

```bash
# Quick start
git clone https://github.com/yolo-maxi/agentation-api.git
cd agentation-api
npm install
ADMIN_TOKEN=secret npm start
```

Or deploy with Docker:

```bash
docker run -d -p 3004:3004 -e ADMIN_TOKEN=secret ghcr.io/yolo-maxi/agentation-api
```

## Features

- **Click to annotate** – Click any element with automatic selector detection
- **Text selection** – Select text to annotate specific content
- **Multi-select** – Drag to select multiple elements
- **Area selection** – Drag to annotate regions
- **Image paste** – Paste reference images (Ctrl+V in comment box)
- **Animation pause** – Freeze CSS animations
- **Dark/light mode** – Auto-detects or set manually
- **10-second auto-send** – Annotations auto-send after countdown (API mode)

## Requirements

- React 18+
- Desktop browser (mobile not supported)

## License

Original agentation © Benji Taylor, PolyForm Shield 1.0.0  
API mode additions © Clawdbot Team, MIT
