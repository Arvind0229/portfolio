/**
 * Side-effect style imports. TypeScript 6 requires a declaration for
 * `import './globals.css'`; the bundler handles the actual asset.
 */
declare module '*.css';
declare module '*.svg' {
  const content: string;
  export default content;
}
