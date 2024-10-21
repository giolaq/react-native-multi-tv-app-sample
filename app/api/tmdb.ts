const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || 'YOUR_FALLBACK_API_KEY'; // Remember this is not a secure way to use api keys in production!
const BASE_URL = 'https://api.themoviedb.org/3';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
}

export async function fetchTrendingMovies(): Promise<Movie[]> {
  const response = await fetch(
    `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`
  );
  const data = await response.json();
  return data.results;
}

export function getImageUrl(path: string, size: string = 'w500'): string {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
