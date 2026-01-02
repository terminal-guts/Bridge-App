# Eva Icons Integration

Bridge uses Eva Icons throughout the app with our custom color scheme.

## Usage

```tsx
import { EvaIcon } from '@/components/icons';

// Basic usage
<EvaIcon name="arrow-back" />

// With variant and color
<EvaIcon
  name="checkmark"
  variant="fill"
  color="success"
  size={24}
/>

// With custom hex color
<EvaIcon
  name="heart"
  variant="fill"
  color="#FF7A5C"
  size={32}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Icon name (without file extension) |
| `variant` | `'fill' \| 'outline'` | `'outline'` | Icon style variant |
| `color` | `BridgeColor \| string` | `'text'` | Icon color (Bridge color name or hex) |
| `size` | `number` | `24` | Icon size in pixels |
| `style` | `ViewStyle` | - | Additional styles |

## Bridge Colors

Use these color names for consistent theming:

### Primary Colors
- `primary` - `#5B8FFF` - Main brand blue
- `primary-light` - `#7BA8FF` - Lighter blue
- `primary-dark` - `#3D72E8` - Darker blue

### Text Colors
- `text` - `#2A1F1A` - Primary text (warm dark)
- `text-secondary` - `#5A524A` - Secondary text
- `text-light` - `#736B63` - Light text

### Background Colors
- `background` - `#FDFAF7` - App background (warm off-white)
- `background-cream` - `#F8F4F0` - Card backgrounds
- `white` - `#FFFFFF` - Pure white
- `black` - `#000000` - Pure black

### Accent Colors
- `coral` - `#FF7A5C` - Romantic/important elements
- `peach` - `#FF9966` - Highlights
- `romantic` - `#FF8B7C` - Soft coral-pink for matches

### Semantic Colors
- `success` - `#52C797` - Success states (mint-green)
- `warning` - `#F59E0B` - Warning states (amber)
- `error` - `#FF7A5C` - Error states (coral-red)

### Neutral Colors
- `neutral` - `#A8A099` - Neutral gray
- `neutral-light` - `#E0D7CE` - Light neutral
- `neutral-dark` - `#3D362F` - Dark neutral

## Common Icon Examples

```tsx
// Navigation
<EvaIcon name="arrow-back" variant="outline" color="text" size={24} />
<EvaIcon name="arrow-forward" variant="outline" color="text" size={24} />
<EvaIcon name="home" variant="outline" color="primary" size={24} />

// Actions
<EvaIcon name="checkmark" variant="fill" color="success" size={20} />
<EvaIcon name="close" variant="outline" color="text" size={24} />
<EvaIcon name="edit" variant="outline" color="primary" size={20} />
<EvaIcon name="trash" variant="outline" color="error" size={20} />

// Social/Love
<EvaIcon name="heart" variant="fill" color="coral" size={24} />
<EvaIcon name="people" variant="outline" color="text" size={24} />
<EvaIcon name="person" variant="outline" color="text" size={24} />
<EvaIcon name="message-circle" variant="outline" color="primary" size={24} />

// UI Feedback
<EvaIcon name="alert-circle" variant="outline" color="warning" size={24} />
<EvaIcon name="alert-triangle" variant="outline" color="error" size={24} />
<EvaIcon name="info" variant="outline" color="primary" size={24} />
<EvaIcon name="checkmark-circle" variant="fill" color="success" size={24} />

// Settings/Profile
<EvaIcon name="settings" variant="outline" color="text" size={24} />
<EvaIcon name="lock" variant="outline" color="text" size={20} />
<EvaIcon name="eye" variant="outline" color="text" size={20} />
<EvaIcon name="eye-off" variant="outline" color="text" size={20} />
```

## Icon Variants

### Outline (Default)
Outline icons have a clean, minimal line style. Use for most UI elements.

### Fill
Filled icons are more prominent. Use for:
- Active states (e.g., selected tab)
- Success confirmations
- Important call-to-actions
- Love/romantic elements

## Available Icons (490 total)

See the full list of available icons in `assets/eva-icons/`:
- 246 fill icons in `fill/svg/`
- 244 outline icons in `outline/svg/`

Common categories:
- Arrows & Navigation
- UI Controls (close, menu, settings)
- Social (people, heart, share)
- Media (play, pause, volume)
- Communication (message, phone, email)
- File & Document
- And many more...

## Regenerating the Icon Registry

If you add new icons to `assets/eva-icons/`, regenerate the registry:

```bash
node scripts/generate-icon-registry.js
```

This will update `src/components/icons/iconRegistry.ts` with all available icons.
