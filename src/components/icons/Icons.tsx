import React from 'react';
import { ViewStyle } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
    style?: ViewStyle;
}

/**
 * mingcute:fire-fill — exact path from Iconify
 * Used for the streak flame indicator beside each user
 */
export const FireIcon: React.FC<IconProps> = ({ size = 13, color = '#2563EB' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path fill={color} d="m11.514 2.142l-1.26-.755l-.24 1.449C9.632 5.124 8.069 7.25 6.345 8.744C2.97 11.67 2.231 14.85 3.276 17.475c1 2.512 3.538 4.232 6.114 4.519l.596.066c-1.474-.901-2.42-3.006-2.09-4.579c.326-1.546 1.438-2.994 3.574-4.33l1.077-.672l.402 1.205c.237.712.647 1.284 1.064 1.865c.2.28.403.563.589.864c.643 1.045.813 2.207.398 3.36c-.378 1.048-1.001 1.872-1.86 2.329l.97-.108c2.418-.269 4.193-1.096 5.346-2.479C20.599 18.144 21 16.379 21 14.5c0-1.75-.719-3.554-1.567-5.055c-.994-1.758-2.291-3.218-3.707-4.633c-.245.49-.226.688-.73 1.475a8.15 8.15 0 0 0-3.482-4.145" />
    </Svg>
);

/**
 * solar:star-line-duotone (outline star) — exact path from design
 * Used for the "80 pts" badge on already-helped users
 */
export const StarIcon: React.FC<IconProps> = ({ size = 13, color = '#34C759' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            stroke={color}
            strokeWidth={1.5}
            d="M12 2l3.09 6.26L22 9.27l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25L7 14.14L2 9.27l6.91-1.01L12 2z"
        />
    </Svg>
);

/**
 * ph:users-three-fill — 3 people group icon exactly matching the design image
 * Used as the Community tab icon (active, blue)
 */
export const UsersTabIcon: React.FC<IconProps> = ({ size = 24, color = '#2563EB' }) => (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <Path d="M64.12 147.8a4 4 0 0 1-4 4.2H16a8 8 0 0 1-7.8-6.17a8.35 8.35 0 0 1 1.62-6.93A67.8 67.8 0 0 1 37 117.51a40 40 0 1 1 66.46-35.8a3.94 3.94 0 0 1-2.27 4.18A64.08 64.08 0 0 0 64 144c0 1.28 0 2.54.12 3.8m182-8.91A67.76 67.76 0 0 0 219 117.51a40 40 0 1 0-66.46-35.8a3.94 3.94 0 0 0 2.27 4.18A64.08 64.08 0 0 1 192 144c0 1.28 0 2.54-.12 3.8a4 4 0 0 0 4 4.2H240a8 8 0 0 0 7.8-6.17a8.33 8.33 0 0 0-1.63-6.94Zm-89 43.18a48 48 0 1 0-58.37 0A72.13 72.13 0 0 0 65.07 212A8 8 0 0 0 72 224h112a8 8 0 0 0 6.93-12a72.15 72.15 0 0 0-33.74-29.93Z" />
    </Svg>
);

/**
 * fluent:handshake-32-filled — exact paths from Iconify
 * Used for the Help/Handshake tab icon (inactive, grey)
 */
export const HandshakeTabIcon: React.FC<IconProps> = ({ size = 24, color = '#8D8D8D' }) => (
    <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path
            fill={color}
            d="M28 12s0 1.134-.465 2.625l-5.182-5.181a1.5 1.5 0 0 0-1.06-.44H16.69a1.5 1.5 0 0 0-.925.32l-1.817 1.422a1.205 1.205 0 0 1-1.693-.207a1.21 1.21 0 0 1 .207-1.696L18.662 4H20a8 8 0 0 1 8 8M7.384 15.33a1.077 1.077 0 0 0-1.525 0l-1.544 1.55a1.084 1.084 0 0 0 0 1.53a1.077 1.077 0 0 0 1.525 0l1.544-1.55a1.083 1.083 0 0 0 0-1.529M8.98 17.42a1.076 1.076 0 0 1 1.526 0a1.084 1.084 0 0 1 0 1.529L8.96 20.496a1.076 1.076 0 0 1-1.525 0a1.084 1.084 0 0 1 0-1.529zm4.117 2.597a1.077 1.077 0 0 0-1.525 0l-1.544 1.548a1.083 1.083 0 0 0 0 1.53a1.076 1.076 0 0 0 1.525 0l1.544-1.549a1.084 1.084 0 0 0 0-1.53m2.59 2.596a1.076 1.076 0 0 0-1.526 0l-1.544 1.549a1.084 1.084 0 0 0 0 1.529a1.076 1.076 0 0 0 1.525 0l1.544-1.549a1.083 1.083 0 0 0 0-1.529m-.647-18.32a7.5 7.5 0 0 0-1.617-.29L13.332 4H13a8 8 0 0 0-8 8v2.087a2.57 2.57 0 0 1 3.444.181c.393.395.633.886.719 1.398a2.58 2.58 0 0 1 3.156 2.532a2.58 2.58 0 0 1 2.592 2.596a2.57 2.57 0 0 1 1.833.756a2.59 2.59 0 0 1 0 3.654l-.225.226l1.274 1.264a1.08 1.08 0 0 0 1.515 0c.414-.41.415-1.074.002-1.485a.753.753 0 0 1 1.061-1.07a1.08 1.08 0 0 0 1.515 0a1.045 1.045 0 0 0 .001-1.486a.754.754 0 0 1 1.061-1.07a1.08 1.08 0 0 0 1.514-.002c.424-.42.422-1.102.017-1.505l-.003-.002l-2.253-2.254a.75.75 0 0 1 1.06-1.06l2.636 2.633c.527.523 1.396.528 1.853.075c.455-.451.451-1.307-.071-1.826l-.002-.002l-6.636-6.635h-4.2l-1.682 1.316a3.205 3.205 0 0 1-4.5-.55a3.21 3.21 0 0 1 .55-4.504z"
        />
    </Svg>
);

/**
 * Stroke checkmark — matches Figma design
 */
export const CheckmarkIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/**
 * Hourglass icon — used for awaiting states
 */
export const HourglassIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M5 2h14M5 22h14M6 2v5l5 5-5 5v5M18 2v5l-5 5 5 5v5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * Arrow right — used as action button for awaiting states
 */
export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, color = '#1C1C1E' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M5 12h14M13 6l6 6-6 6"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * Question/info icon — used in awaiting_them expiry banner
 */
export const QuestionIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z" fill={color} />
        <Path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6z" fill={color} />
    </Svg>
);

/**
 * Legacy ClockIcon kept for any existing usages
 */
export const ClockIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/**
 * Chat icon — used as action button for active match
 */
export const ChatIcon: React.FC<IconProps> = ({ size = 24, color = '#2563EB' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M8 4c-1.1 0-2 .9-2 2v1h9c1.65 0 3 1.35 3 3v6h1c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H8z" />
        <Path d="M4 8c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h3l2 3l2-3h5c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2H4z" />
        <Circle cx="7" cy="14" r="1.2" fill="#FFF" />
        <Circle cx="10.5" cy="14" r="1.2" fill="#FFF" />
        <Circle cx="14" cy="14" r="1.2" fill="#FFF" />
    </Svg>
);

/**
 * Two overlapping hearts — used for "Matched by" row on MatchCard
 */
export const HeartsIcon: React.FC<IconProps> = ({ size = 20, color = '#00C8B3' }) => {
    // Two overlapping hearts scaled to fit within viewBox with no clipping
    const heartD = "M10 16c-3.6-3.2-5.6-5.2-5.6-7.2 0-2.4 1.6-3.6 3.6-3.6 1.2 0 2.4.64 3.2 1.6.8-.96 2-1.6 3.2-1.6 2 0 3.6 1.2 3.6 3.6 0 2-2 4-5.6 7.2z";
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d={heartD} transform="translate(-1.5, -1)" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={heartD} transform="translate(3.5, 3)" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
};

/**
 * Hexagon (6 sides) with user/person silhouette inside
 * Matches vuesax/bold/user-octagon style from the Figma design image
 */
export const ProfileTabIcon: React.FC<IconProps> = ({ size = 24, color = '#8D8D8D' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Hexagon outline — 6 equal sides, pointed top */}
        {/* Solid hexagon background */}
        <Path
            fill={color}
            d="M12 2L4.268 6.5v9L12 20l7.732-4.5v-9L12 2z"
        />
        {/* Person head — white so it reads over the filled hexagon */}
        <Circle cx="12" cy="9.5" r="2.3" fill="white" />
        {/* Person body — white */}
        <Path
            fill="white"
            d="M12 13c-2.76 0-4.5.93-4.5 2.08V15.5h9v-.42C16.5 13.93 14.76 13 12 13z"
        />
    </Svg>
);

/**
 * Gift box — used for "friends picked someone" badge
 */
export const GiftIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/**
 * Wine glass — simple outline style
 * Used for substance-related preference icons
 */
export const WineGlassIcon: React.FC<IconProps> = ({ size = 24, color = '#667085', style }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        <Path
            d="M8 2h8v6c0 2.21-1.79 4-4 4s-4-1.79-4-4V2z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 12v5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
        <Path
            d="M8 22h8"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
        <Path
            d="M12 17v5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
    </Svg>
);

/**
 * Leaf — simple stylized leaf outline
 * Used for substance-related preference icons
 */
export const LeafIcon: React.FC<IconProps> = ({ size = 24, color = '#667085', style }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        <Path
            d="M11 20A7 7 0 0 1 4 13C4 9.13 7.13 6 11 6a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M11 20V12"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
        <Path
            d="M7 15c2-2 4-3 7-3"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
    </Svg>
);

/**
 * Cigarette with smoke wisp — simple outline style
 * Used for substance-related preference icons
 */
export const CigaretteIcon: React.FC<IconProps> = ({ size = 24, color = '#667085', style }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        {/* Cigarette body */}
        <Path
            d="M2 16h16v3H2z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Filter section */}
        <Path
            d="M14 16v3"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
        {/* Smoke wisps */}
        <Path
            d="M19 15c0-1.5 1.5-2 1.5-3.5S19 9.5 19 8"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
        />
        <Path
            d="M22 15c0-1.5 1-1.5 1-3s-1-1.5-1-3"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
        />
    </Svg>
);

/**
 * Pill capsule — simple outline style
 * Used for substance-related preference icons
 */
export const PillIcon: React.FC<IconProps> = ({ size = 24, color = '#667085', style }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        <Path
            d="M10.5 3.5a5.5 5.5 0 0 0-7.78 7.78l10 10a5.5 5.5 0 0 0 7.78-7.78l-10-10z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Dividing line across the capsule center */}
        <Path
            d="M8.11 15.89L15.89 8.11"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
    </Svg>
);

