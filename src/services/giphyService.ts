// GIFs du chat via l'API GIPHY (gratuite). Sans clé VITE_GIPHY_API_KEY, le
// bouton GIF est simplement masqué.
const API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

export const gifsEnabled = !!API_KEY;

export interface Gif {
  id: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
}

export const searchGifs = async (searchTerm: string, lang: 'fr' | 'en'): Promise<Gif[]> => {
  if (!API_KEY) return [];
  const q = searchTerm.trim();
  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=${lang}`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=pg-13`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('GIPHY error');
  const data = await response.json();
  return (data.data || []).map((g: any) => ({
    id: g.id,
    previewUrl: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url,
    url: g.images?.fixed_width?.url,
    width: Number(g.images?.fixed_width?.width) || 200,
    height: Number(g.images?.fixed_width?.height) || 200,
  })).filter((g: Gif) => g.url);
};
