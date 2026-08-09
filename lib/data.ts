export type Movie = {
  tmdbId: number;
  title: string;
  releaseYear: string;
  rating: number;
  averageRating?: number;
  watched: boolean;
  posterPath: string;
  backdropPath?: string;
  director?: string;
  overview: string;
  reviewer?: string;
  reviewCount: number;
  userRating?: number;
  reviewed?: boolean;
  reviewBody?: string;
};

export type Review = {
  id: string;
  movie: Movie;
  author: string;
  body: string;
  date: string;
};

export const seedMovies: Movie[] = [
  {
    tmdbId: 550,
    title: "Fight Club",
    releaseYear: "1999",
    rating: 5,
    watched: false,
    posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    overview: "An insomniac office worker and a soap maker form an underground fight club that evolves into something much larger.",
    reviewer: "Stephen",
    reviewCount: 18
  },
  {
    tmdbId: 680,
    title: "Pulp Fiction",
    releaseYear: "1994",
    rating: 5,
    watched: false,
    posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    overview: "Interwoven stories of crime, loyalty, and chance collide across Los Angeles.",
    reviewer: "Sarni",
    reviewCount: 21
  },
  {
    tmdbId: 129,
    title: "Spirited Away",
    releaseYear: "2001",
    rating: 5,
    watched: false,
    posterPath: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    overview: "A young girl enters a spirit world and must find courage to save her parents.",
    reviewer: "Ayush",
    reviewCount: 34
  },
  {
    tmdbId: 244786,
    title: "Whiplash",
    releaseYear: "2014",
    rating: 5,
    watched: false,
    posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    overview: "A driven jazz drummer is pushed to his limits by a ruthless instructor.",
    reviewer: "Santosh",
    reviewCount: 16
  },
  {
    tmdbId: 496243,
    title: "Parasite",
    releaseYear: "2019",
    rating: 5,
    watched: false,
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    overview: "A poor family infiltrates a wealthy household in a darkly comic thriller about class.",
    reviewer: "User01",
    reviewCount: 29
  },
  {
    tmdbId: 157336,
    title: "Interstellar",
    releaseYear: "2014",
    rating: 4,
    watched: false,
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    overview: "Explorers travel through a wormhole in search of a future for humanity.",
    reviewer: "nottogo",
    reviewCount: 24
  },
  {
    tmdbId: 346698,
    title: "Barbie",
    releaseYear: "2023",
    rating: 4,
    watched: false,
    posterPath: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    overview: "Barbie leaves Barbieland and enters the real world in a bright, existential comedy.",
    reviewer: "Meera",
    reviewCount: 13
  },
  {
    tmdbId: 872585,
    title: "Oppenheimer",
    releaseYear: "2023",
    rating: 5,
    watched: false,
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    overview: "The story of J. Robert Oppenheimer and the creation of the atomic bomb.",
    reviewer: "Kabir",
    reviewCount: 27
  },
  {
    tmdbId: 693134,
    title: "Dune: Part Two",
    releaseYear: "2024",
    rating: 5,
    watched: false,
    posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    overview: "Paul Atreides unites with the Fremen while war spreads across Arrakis.",
    reviewer: "Anya",
    reviewCount: 31
  },
  {
    tmdbId: 792307,
    title: "Poor Things",
    releaseYear: "2023",
    rating: 4,
    watched: false,
    posterPath: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    overview: "A woman brought back to life travels through a strange, lavish world of appetite and discovery.",
    reviewer: "Rohan",
    reviewCount: 19
  },
  {
    tmdbId: 545611,
    title: "Everything Everywhere All at Once",
    releaseYear: "2022",
    rating: 5,
    watched: false,
    posterPath: "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    overview: "A laundromat owner is pulled into a multiverse crisis involving every life she could have lived.",
    reviewer: "Ira",
    reviewCount: 42
  },
  {
    tmdbId: 278,
    title: "The Shawshank Redemption",
    releaseYear: "1994",
    rating: 5,
    watched: false,
    posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    overview: "Two imprisoned men form a bond across decades while holding onto hope.",
    reviewer: "Dev",
    reviewCount: 38
  }
];

export const featuredMovies = seedMovies.slice(0, 5);
export const popularReviews = seedMovies.slice(5, 10);
export const profileFilms = [...seedMovies, ...seedMovies].map((movie, index) => ({
  ...movie,
  tmdbId: movie.tmdbId + index * 100000,
  watched: false
}));

export const reviews: Review[] = [
  {
    id: "review-1",
    movie: seedMovies[0],
    author: "Stephen",
    body: "Mean, stylish, and still annoyingly quotable. The ending hits harder when you watch it with friends arguing beside you.",
    date: "Jun 14"
  },
  {
    id: "review-2",
    movie: seedMovies[8],
    author: "Ayush",
    body: "Huge theatre movie. The sound, the faces, the sand, the patience. Exactly why shared watchlists need to exist.",
    date: "Jun 12"
  },
  {
    id: "review-3",
    movie: seedMovies[3],
    author: "Santosh",
    body: "Anxiety with cymbals. I hated how tense it made me and then immediately wanted to watch it again.",
    date: "Jun 09"
  }
];

export function posterUrl(path: string, size = "w500") {
  if (path.startsWith("http") || path.startsWith("/assets")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${size}${path}`;
}
