/** Configuration for a supported city in the app. */
export interface CityConfig {
  id: string;
  label: string;
  labelZh: string;
  center: [number, number];
  zoom: number;
  guides: GuideConfig[];
}

/** A single guide (data source) within a city. */
export interface GuideConfig {
  id: string;
  label: string;
  labelZh: string;
  year: number;
  dataPath: string;
}

/** Registry of all available cities. Add new cities here to expand coverage. */
export const cities: CityConfig[] = [
  {
    id: "hong-kong",
    label: "Hong Kong",
    labelZh: "香港",
    center: [22.302, 114.177],
    zoom: 11,
    guides: [
      {
        id: "michelin-bib-gourmand",
        label: "Michelin Bib Gourmand 2026",
        labelZh: "米其林必比登",
        year: 2026,
        dataPath: "/data/hong-kong/michelin-bib-gourmand.json",
      },
      {
        id: "michelin-starred",
        label: "Michelin Starred 2026",
        labelZh: "米其林星级",
        year: 2026,
        dataPath: "/data/hong-kong/michelin-starred.json",
      },
    ],
  },
  {
    id: "beijing",
    label: "Beijing",
    labelZh: "北京",
    center: [39.904, 116.407],
    zoom: 11,
    guides: [
      {
        id: "michelin-bib-gourmand",
        label: "Michelin Bib Gourmand 2026",
        labelZh: "米其林必比登",
        year: 2026,
        dataPath: "/data/beijing/michelin-bib-gourmand.json",
      },
      {
        id: "michelin-starred",
        label: "Michelin Starred 2026",
        labelZh: "米其林星级",
        year: 2026,
        dataPath: "/data/beijing/michelin-starred.json",
      },
    ],
  },
  {
    id: "guangzhou-shenzhen",
    label: "Guangzhou & Shenzhen",
    labelZh: "广州 · 深圳",
    center: [23.13, 113.26],
    zoom: 10,
    guides: [
      {
        id: "michelin-starred",
        label: "Michelin Starred 2026",
        labelZh: "米其林星级",
        year: 2026,
        dataPath: "/data/guangzhou-shenzhen/michelin-starred.json",
      },
      {
        id: "michelin-bib-gourmand",
        label: "Michelin Bib Gourmand 2026",
        labelZh: "米其林必比登",
        year: 2026,
        dataPath: "/data/guangzhou-shenzhen/michelin-bib-gourmand.json",
      },
    ],
  },
];
