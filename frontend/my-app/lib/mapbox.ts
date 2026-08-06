// Mapbox config for CascadeAI
// Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Dark satellite style — perfect for the dashboard aesthetic
export const MAPBOX_STYLE = "mapbox://styles/mapbox/standard";

// Assam + West Bengal operations area — default map center and zoom
export const DEFAULT_VIEW = {
  longitude: 90.9,
  latitude:  24.9,
  zoom:      5.7,
  pitch:     30,   // slight tilt for depth
  bearing:   0,
};

// Regional coverage envelope used to constrain map panning.
export const OPERATIONS_BOUNDS: [[number, number], [number, number]] = [
  [85.75, 21.5],
  [96.0, 28.45],
];

// Deck.gl viewport defaults — matches DEFAULT_VIEW
export const INITIAL_VIEWPORT = {
  longitude:  90.9,
  latitude:   24.9,
  zoom:       5.7,
  pitch:      30,
  bearing:    0,
  width:      "100%",
  height:     "100%",
};
