// ── Radio Garden API types ──

export interface Place {
  id: string;
  geo: [number, number]; // [lng, lat]
  url: string;
  size: number;
  boost: boolean;
  title: string;
  country: string;
}

export interface PlacesResponse {
  apiVersion: number;
  version: string;
  data: {
    list: Place[];
    version: string;
  };
}

export interface ChannelRefPage {
  url: string;
  title: string;
  subtitle?: string;
  place?: { id: string; title: string };
  country?: { id: string; title: string };
  website?: string;
  secure?: boolean;
  stream?: string;
  map?: string;
  type?: string;
}

export interface ChannelRef {
  href?: string;
  title?: string;
  subtitle?: string;
  map?: string;
  page?: ChannelRefPage;
}

export interface ChannelRefsGroup {
  itemsType: string;
  type: string;
  items: ChannelRef[];
}

export interface PlaceChannelsResponse {
  apiVersion: number;
  version: string;
  data: {
    title: string;
    subtitle?: string;
    url: string;
    map: string;
    count: number;
    utcOffset: number;
    content: ChannelRefsGroup[];
  };
}

export interface Channel {
  id: string;
  title: string;
  url: string;
  website: string;
  secure: boolean;
  place: {
    id: string;
    title: string;
  };
  country: {
    id: string;
    title: string;
  };
}

export interface ChannelResponse {
  apiVersion: number;
  version: string;
  data: Channel;
}

export interface SearchResultPage {
  url: string;
  type: string;
  title: string;
  subtitle?: string;
  map?: string;
  count?: number;
  place?: { id: string; title: string };
  country?: { id: string; title: string };
  website?: string;
  secure?: boolean;
  stream?: string;
}

export interface SearchResultSource {
  code: string;
  type: "channel" | "place" | "country";
  page: SearchResultPage;
  // Legacy flat fields (may not exist in newer responses)
  subtitle?: string;
  title?: string;
  url?: string;
}

export interface SearchResult {
  _id?: string;
  _score: number;
  _source: SearchResultSource;
}

export interface SearchResponse {
  apiVersion: number;
  version: string;
  query: string;
  took: number;
  hits: {
    hits: SearchResult[];
  };
}

export interface GeoLocation {
  ip: string;
  country_code: string;
  country_name: string;
  region_code: string;
  region_name: string;
  city: string;
  zip_code: string;
  time_zone: string;
  latitude: number;
  longitude: number;
  metro_code: number;
}

// Internal UI types
export interface StationMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  country: string;
  size: number;
}
