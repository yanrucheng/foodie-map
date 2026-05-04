/** Configuration for a supported city in the app. */
export interface CityConfig {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  guides: GuideConfig[];
}

/** A single guide (data source) within a city. */
export interface GuideConfig {
  id: string;
  label: string;
  dataPath: string;
}

/** Registry of all available cities. Add new cities here to expand coverage. */
export const cities: CityConfig[] = [
  {
    id: "hong-kong",
    label: "Hong Kong",
    center: [22.302, 114.177],
    zoom: 11,
    guides: [
      {
        id: "michelin-bib-gourmand",
        label: "Michelin Bib Gourmand 2026",
        dataPath: "/data/hong-kong/michelin-bib-gourmand.json",
      },
    ],
  },
];
