/// <reference types="nativewind/types" />

declare module 'nativewind' {
  import { ComponentType } from 'react';
  export function styled<P>(component: ComponentType<P>): ComponentType<P & { className?: string }>;
}