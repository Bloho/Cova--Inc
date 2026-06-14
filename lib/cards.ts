type ProfileCardInput = {
  bg: string;
  shape: string;
  text: string;
  accent: string;
  username: string;
  films: number;
  date: string;
};

type MovieCardInput = ProfileCardInput & {
  movieTitle: string;
  rating: number;
  posterUrl?: string;
};

const covaPath =
  "M111.717 422.207C211.366 422.207 247.02 503.701 268.047 611.423C279.932 671.372 288.16 736.006 333.87 736.006C363.125 736.006 384.151 715.398 384.151 662.006C384.151 596.436 360.382 571.145 308.272 566.461V441.878C397.865 446.562 472.83 511.195 472.83 667.626C472.83 785.652 425.291 860.588 290.902 860.588H96.1758C67.8353 860.588 55.0361 863.399 55.0361 880.26C55.0361 883.07 55.036 885.88 55.9502 891.5H-8.95801C-13.529 867.146 -15.3574 841.855 -15.3574 822.184C-15.3574 767.854 6.58299 744.436 50.4648 737.879V736.006C5.66872 702.284 -23.5859 647.955 -23.5859 575.828C-23.5859 481.22 30.3524 422.207 111.717 422.207ZM123.602 554.283C85.205 554.283 66.0068 577.702 66.0068 622.664C66.0071 691.044 112.632 736.006 176.626 736.006H225.993C216.851 718.208 209.538 689.17 199.481 645.145C185.768 579.575 162.913 554.283 123.602 554.283ZM457.288 73.6191L124.516 181.341V182.277L457.288 289.999V418.328L-9.87305 250.657V109.214L457.288 -58.458V73.6191ZM223.251 -566.624C369.524 -566.624 472.83 -472.016 472.83 -315.585C472.83 -161.028 372.267 -66.4199 225.079 -66.4199C77.8916 -66.4199 -24.4998 -161.027 -24.5 -317.458C-24.5 -472.015 76.0633 -566.624 223.251 -566.624ZM224.165 -435.484C130.916 -435.484 71.4922 -395.205 71.4922 -316.521C71.4923 -237.838 130.916 -197.56 224.165 -197.56C317.414 -197.56 375.924 -237.838 375.924 -316.521C375.924 -395.205 317.414 -435.484 224.165 -435.484ZM315.586 -1220.5C514.883 -1220.5 657.5 -1102.47 657.5 -899.208C657.5 -723.106 552.366 -622.878 409.749 -606.954V-752.145C477.401 -764.322 543.224 -798.98 543.224 -904.828C543.224 -1032.22 443.575 -1075.31 317.414 -1075.31C190.339 -1075.31 90.6904 -1032.22 90.6904 -904.828C90.6904 -798.043 156.513 -761.512 231.479 -752.145V-606.954C83.3767 -621.942 -23.5859 -724.98 -23.5859 -902.955C-23.5857 -1106.22 119.945 -1220.5 315.586 -1220.5Z";

export function profileCardSvg(input: ProfileCardInput) {
  return `<svg width="445" height="668" viewBox="0 0 445 668" fill="none" xmlns="http://www.w3.org/2000/svg">
  <clipPath id="clip"><rect width="445" height="668" rx="21"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="445" height="668" fill="${input.bg}"/>
    <path d="${covaPath}" fill="${input.shape}" opacity=".42"/>
    <path d="M-20 112L465 -46V76L112 183L465 294V416L-20 251V112Z" fill="white" opacity=".16"/>
    <path d="M0 257L445 414V668H0V257Z" fill="white" opacity=".12"/>
    <path d="M0 104L296 0H445L0 104Z" stroke="white" opacity=".55"/>
    <path d="M89 191L445 76" stroke="white" opacity=".48"/>
    <text x="422" y="51" text-anchor="end" fill="white" opacity=".38" font-family="Arial, sans-serif" font-size="43" font-weight="800">Cova</text>
    <text x="222" y="173" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="31" font-weight="800">Top 0.01% Cinephile</text>
    <text x="222" y="361" text-anchor="middle" fill="${input.text}" font-family="Arial, sans-serif" font-size="126" font-weight="900">${input.films}</text>
    <text x="222" y="400" text-anchor="middle" fill="${input.text}" font-family="Arial, sans-serif" font-size="35" font-weight="800">Films</text>
    <text x="222" y="439" text-anchor="middle" fill="white" opacity=".42" font-family="Arial, sans-serif" font-size="25" font-weight="800">${escapeXml(input.date)}</text>
    <text x="39" y="646" fill="${input.accent}" font-family="Arial, sans-serif" font-size="38" font-weight="900">cova.quest/${escapeXml(input.username)}</text>
  </g>
</svg>`;
}

export function movieCardSvg(input: MovieCardInput) {
  const poster = input.posterUrl
    ? `<image href="${escapeXml(input.posterUrl)}" x="28" y="25" width="390" height="504" preserveAspectRatio="xMidYMid slice" clip-path="url(#posterClip)"/>`
    : `<rect x="28" y="25" width="390" height="504" rx="10" fill="${input.shape}"/><text x="223" y="287" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="52" font-weight="900">${escapeXml(input.movieTitle)}</text>`;

  return `<svg width="445" height="668" viewBox="0 0 445 668" fill="none" xmlns="http://www.w3.org/2000/svg">
  <clipPath id="clip"><rect width="445" height="668" rx="21"/></clipPath>
  <clipPath id="posterClip"><rect x="28" y="25" width="390" height="504" rx="10"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="445" height="668" fill="${input.bg}"/>
    <path d="${covaPath}" fill="white" opacity=".1"/>
    <path d="M-22 111L464 -55V76L123 182L464 291V419L-22 251V111Z" fill="${input.shape}" opacity=".3"/>
    ${poster}
    <rect x="27.5" y="24.5" width="391" height="505" rx="10.5" stroke="white" stroke-width="3"/>
    <text x="222" y="575" text-anchor="middle" fill="${input.text}" font-family="Arial, sans-serif" font-size="28" font-weight="900">I scored <tspan fill="${input.accent}">${escapeXml(input.movieTitle)}</tspan> a</text>
    <text x="222" y="619" text-anchor="middle" fill="${input.text}" font-family="Arial, sans-serif" font-size="45" font-weight="900">${"★".repeat(input.rating)}${"☆".repeat(5 - input.rating)}</text>
    <text x="222" y="648" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="900">cova.quest/${escapeXml(input.username)}</text>
  </g>
</svg>`;
}

export function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
