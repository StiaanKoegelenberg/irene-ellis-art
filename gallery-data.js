// Portfolio image data — the ONE source of truth for which images each
// category shows. Loaded by BOTH the public site and the admin preview, so the
// fanned cards, the site's dark gallery, and the admin preview all read the
// same list. To add/remove a piece: drop the file in
// images/portfolio/<Category N>/ and edit its list here.
//
// GALLERY_BASE lets each page reach the same images folder from where it sits:
// the site (at the root) uses the default; the admin page (in /admin/) sets
// window.GALLERY_BASE = "../images/portfolio/" BEFORE loading this file.
window.GALLERY_BASE = window.GALLERY_BASE || "images/portfolio/";

window.GALLERY = {
  "Category one": [
    "Category 1/download.jpg",
    "Category 1/download2.jpg",
    "Category 1/download 3.jpg",
    "Category 1/download 5.jpg",
    "Category 1/download6.jpg",
  ],
  "Category two": [
    "Category 2/download (1).jpg",
    "Category 2/download2.jpg",
    "Category 2/download3.jpg",
    "Category 2/download4.jpg",
    "Category 2/download5.jpg",
    "Category 2/download6.jpg",
  ],
  "Category three": [
    "Category 3/download1.jpg",
    "Category 3/download2.jpg",
    "Category 3/download3.jpg",
    "Category 3/download4.jpg",
    "Category 3/download 4.jpg",
  ],
};

// encodeURI keeps the slashes but escapes spaces in the folder/file names.
window.gallerySrc = function (rel) {
  return encodeURI((window.GALLERY_BASE || "images/portfolio/") + rel);
};
