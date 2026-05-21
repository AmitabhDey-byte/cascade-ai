// Mapbox config for CascadeAI
// Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Dark satellite style — perfect for the dashboard aesthetic
export const MAPBOX_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

// Sundarbans delta — default map center and zoom
export const DEFAULT_VIEW = {
  longitude: 88.9,
  latitude:  21.9,
  zoom:      9,
  pitch:     30,   // slight tilt for depth
  bearing:   0,
};

// Bounding box for the Sundarbans region
// Used to constrain map panning during the demo
export const SUNDARBANS_BOUNDS: [[number, number], [number, number]] = [
  [88.0, 21.5],   // southwest corner [lon, lat]
  [89.5, 22.5],   // northeast corner [lon, lat]
];

// Deck.gl viewport defaults — matches DEFAULT_VIEW
export const INITIAL_VIEWPORT = {
  longitude:  88.9,
  latitude:   21.9,
  zoom:       9,
  pitch:      30,
  bearing:    0,
  width:      "100%",
  height:     "100%",
};