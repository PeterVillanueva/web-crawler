# Crawler

An animated, two-view website about web crawlers. The Playground is a single hero with a scrollable document, a procedural Three.js spider, and GSAP contact effects. About provides a detailed explanation of real crawling and indexing. Barba handles navigation without a full-page reload.

## Run locally

```sh
npm install
npm run build
npm run dev
```

Open http://127.0.0.1:4173. The development server serves `dist` on this fixed port. After editing JavaScript, run `npm run build` and refresh, or use `npm run watch` in a second terminal. HTML and CSS are authored directly in `dist` and only need a refresh.

## How it works

- `src/spider.js` creates the 3D mesh, lighting, eight animated legs, and projected contact points. No model download is needed.
- `src/playground.js` chooses visible text targets as the document scrolls. Effects trigger when a projected foot or head overlaps a text box. A shuffled bag provides all six effects before repeating: highlight, real blue underlined link, font enlargement, positive/negative tilt, outline, and falling text.
- `src/main.js` owns Barba transitions and disposes the previous page's animation frame, events, effects, WebMCP registration, GPU resources, and resize observer.
- `dist/index.html`, `dist/about.html`, and `dist/style.css` contain the page content and responsive layout.

Pause freezes the crawler and in-flight text animations. Reset restores original text, scroll position, and discovery count. Generated links point to the About page's discovery explanation. Keyboard users can focus the scrollable document and use Page Down, Page Up, and arrow keys. Reduced-motion preferences disable gait, animated travel, falling motion, and page wipes; static discovery feedback remains available.

Three.js, GSAP, and Barba are bundled locally. Google Fonts are optional; system fonts provide fallbacks. The 3D model requires WebGL. This is an educational simulation and does not crawl external websites or alter any outside content.

## Content references

- [Google Search: how it works](https://developers.google.com/search/docs/fundamentals/how-search-works)
- [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot)
