import type { CSSProperties } from "react";
import Link from "next/link";
import { getPopularTableMovies } from "@/lib/tmdb";
import { getCurrentUserProfile } from "@/lib/library";
import { posterUrl } from "@/lib/data";
import styles from "./table.module.css";
import { BetaActions } from "./BetaActions";

export const metadata = {
  title: "Cova | Homepage Beta",
  robots: { index: false, follow: false }
};

// Clockwise corners traced from the reference, in its 1930 x 1280 coordinate space.
const covers = [
  [638, 340, 918, 342, 911, 655, 580, 654],
  [925, 376, 1235, 374, 1270, 600, 921, 601],
  [1275, 437, 1575, 440, 1634, 755, 1301, 753],
  [821, 555, 1060, 614, 1077, 919, 774, 903],
  [1060, 608, 1269, 600, 1320, 905, 1078, 918],
  [1317, 782, 1569, 782, 1656, 1113, 1356, 1106],
  [1005, 920, 1314, 908, 1409, 1280, 1008, 1280],
  [700, 941, 966, 938, 1007, 1280, 665, 1280],
  [241, 930, 610, 930, 596, 1280, 126, 1280],
  [1681, 579, 1827, 580, 1910, 807, 1680, 813],
  [1544, 367, 1719, 360, 1829, 578, 1623, 568],
  [944, 219, 1080, 212, 1098, 354, 939, 355],
  [655, 109, 878, 106, 884, 326, 622, 335],
  [323, 151, 499, 154, 456, 319, 245, 318],
  [516, 113, 640, 106, 619, 208, 492, 210],
  [490, 216, 614, 213, 599, 335, 462, 336],
  [180, 325, 431, 329, 323, 590, 33, 578],
  [429, 365, 619, 365, 587, 561, 351, 563],
  [1574, 91, 1758, 90, 1841, 235, 1636, 242],
  [1108, 132, 1568, 121, 1660, 345, 1131, 354],
  [56, 633, 280, 626, 135, 1010, -102, 1012],
  [284, 624, 580, 612, 527, 982, 141, 1010],
  [580, 660, 804, 661, 759, 984, 527, 982],
  [1695, 245, 1879, 238, 1930, 410, 1754, 423],
  [1378, 1106, 1592, 1112, 1660, 1310, 1418, 1300],
  [1725, 987, 1950, 971, 2040, 1280, 1806, 1280],
  [-90, 767, 145, 775, 59, 1091, -143, 1083],
  [1860, 580, 1990, 579, 2050, 855, 1917, 825]
];

// Solve the projective mapping from a poster rectangle to each photographed surface.
function posterHeight(corners: number[]) {
  const edge = (a: number, b: number) => Math.hypot(corners[a] - corners[b], corners[a + 1] - corners[b + 1]);
  return 300 * (edge(0, 6) + edge(2, 4)) / (edge(0, 2) + edge(6, 4));
}

function projection(corners: number[]) {
  const height = posterHeight(corners);
  const source = [[0, 0], [300, 0], [300, height], [0, height]];
  const rows = source.flatMap(([x, y], index) => {
    const u = corners[index * 2];
    const v = corners[index * 2 + 1];
    return [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]];
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    rows[column] = rows[column].map(value => value / divisor);
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      rows[row] = rows[row].map((value, index) => value - factor * rows[column][index]);
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map(row => row[8]);
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}

export default async function HomepageBeta() {
  const [movies, account] = await Promise.all([getPopularTableMovies(), getCurrentUserProfile()]);
  const username = account.profile?.username;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Cova home" className={styles.logo}><img src="/assets/Cova-logo-white.svg" alt="Cova" /></Link>
        <Link className={styles.account} href={username ? `/${username}` : "/login"} aria-label={username ? "Your profile" : "Sign in"}>
          {account.user && account.profile?.avatar_url ? <img src={account.profile.avatar_url} alt="" /> : <img className="signed-out-profile-icon" src="/icons/profile.svg" alt="" />}
        </Link>
      </header>
      <BetaActions isSignedIn={Boolean(account.user)} />
      {movies.length ? (
        <div className={styles.scroll}>
          <svg className={styles.scene} viewBox="0 0 1930 1280" aria-label="Popular movies on the Cova table">
            <image href="/assets/homepage-beta-table.png" width="1930" height="1280" />
            <foreignObject width="1930" height="1280">
              <div className={styles.posters}>
                {movies.slice(0, covers.length).map((movie, index) => (
                  <div className={styles.surface} key={movie.tmdbId} style={{ "--placement": projection(covers[index]), height: posterHeight(covers[index]), zIndex: covers.length - index } as CSSProperties}>
                    <Link href={`/movie/${movie.tmdbId}`} prefetch={false} className={styles.poster} aria-label={`${movie.title} (${movie.releaseYear})`} title={`${movie.title} (${movie.releaseYear})`}>
                      <img src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} draggable={false} loading={index < 6 ? "eager" : "lazy"} />
                    </Link>
                  </div>
                ))}
              </div>
            </foreignObject>
          </svg>
        </div>
      ) : <div className={styles.empty}><img src="/assets/error.png" alt="" /><p>Movies are temporarily unavailable.</p><Link href="/homepage-beta">Try again</Link></div>}
    </main>
  );
}
