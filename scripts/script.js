// #region ثابت ها

const TEHRAN_COORDINATES = [35.688812, 51.389626];
const TABRIZ_COORDINATES = [38.074109, 46.29626];
const ZANJAN_COORDINATES = [36.679453, 48.499864];

const DORSA_API_KEY = "service.c97de0690591474fa692d23586344505";
const MAPTILER_KEY = "Cu50RAxzsO9VGvAsDPWd";
// میزان تاخیر به میلی ثانیه برای فیلد جستجو
const SEARCH_INPUT_DELAY = 500;
const SEARCH_HISTORY_KEY = "searchHistory";
const CHECK_COUNTRY_DELAY = 1000;

// DOM
const returnBtn = document.getElementById("return-btn");
const outOfBorder = document.getElementById("out-of-border");
const marker = document.getElementById("marker");
const coordinatesDisplay = document.getElementById("coordinates");
const input = document.getElementById("input");
const inputBtn = document.getElementById("input-btn");
const backdrop = document.getElementById("backdrop");
const modal = document.getElementById("modal");
const okBtn = document.getElementById("ok-btn");
const searchSheet = document.getElementById("search-sheet");
const searchInput = document.getElementById("search-input");
const searchList = document.getElementById("search-list");
const historyContainer = document.getElementById("history-container");
const historyList = document.getElementById("history-list");
const emptyState = document.getElementById("empty-state");
const clearBtn = document.getElementById("clear-btn");
const searchCloseBtn = document.getElementById("search-close-btn");

// ساخت آبجکت از کلاس های ای پی آی نقشه
const neshan = new Neshan(DORSA_API_KEY);
const nominatim = new Nominatim();

/** مارکر موقعیت کاربر */
const svgMarkerUser = `
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
    >
      <!-- دایره دارای انیمیشن کمرنگ شونده -->
      <circle class="pulsing-circle" cx="40" cy="40" r="10" />
      <!-- دایره داخلی ثابت -->
      <circle class="inner-circle" cx="40" cy="40" r="10" />
    </svg>
`;
// ساخت مارکر موقعیت کاربر
const userMarkerIcon = L.divIcon({
  className: "pulsing-circle",
  html: svgMarkerUser,
  iconSize: [32, 32],
  iconAnchor: [40, 40],
});

// #endregion ثابت ها

// #region متغیر ها

/** نقشه */
let map;
/** آیدی تایمر فیلد جستجو */
let timeoutId;
/** تعیین وضعیت باز بودن مودال */
let isModalOpen;
/** تعیین وضعیت باز بودن صفحه جستجو */
let isSearchOpen;
/** فعال و غیر فعالسازی نومیناتیم رورس ای پی آی */
let isNominatimReverseEnabled = false;
let isNeshanReverseEnabled = true;
/** فعال و غیر فعالسازی نشان ژوکودینگ ای پی آی */
let isNeshanGeocodingEnabled = true;
/** فعال و غیر فعالسازی نشان سرچ ای پی آی */
let isNeshanSearchEnabled = true;
/** مارکر موقعیت داینامیک کاربر */
let userMarker;
/** موقعیت داینامیک کاربر */
let userLocation = { lat: null, lng: null };
/** متغیر برای حرکت نقشه به موقعیت کاربر در اجرای اولیه */
let firstLaunch = true;

// #endregion متغیر ها

// #region اجرای کد ها

//Initialize map
map = L.map("map", {
  center: TABRIZ_COORDINATES,
  zoom: 13,
});

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   maxZoom: 19,
//   attribution: "© OpenStreetMap contributors",
// }).addTo(map);

// L.maptiler
//   .maptilerLayer({
//     apiKey: MAPTILER_KEY,
//     style: "streets-v2",
//     //style: "openstreetmap",
//     language: "fa",
//   })
//   .addTo(map);

// Update show coordinates values
updateCoordinates();

// Show address in field
const center = map.getCenter();
isNeshanReverseEnabled && reverseGeocode(center.lat, center.lng);

// Check user location continously
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(updateUserPosition, (error) => {
    firstLaunch = false;
    removeUserMarker();
    resetUserLocation();
    switch (error.code) {
      case error.PERMISSION_DENIED:
        showToast("کاربر درخواست موقعیت مکانی را رد کرد", {
          type: "error",
        });
        break;
      case error.POSITION_UNAVAILABLE:
        showToast("موقعیت کاربر در دسترس نیست", {
          type: "error",
        });
        break;
      case error.TIMEOUT:
        showToast("زمان درخواست برای دریافت موقعیت کاربر به پایان رسیده است", {
          type: "error",
        });
        break;
      case error.UNKNOWN_ERROR:
        showToast("خطایی نامشخص در جستجوی موقعیت کاربر رخ داد", {
          type: "error",
        });
        break;
    }
  });
} else {
  showToast("موقعیت کاربر توسط این مرورگر پشتیبانی نمی شود", {
    type: "warning",
  });
  firstLaunch = false;
  // اگر مارکر کاربر وجود دارد، آنرا حذف می کند
  removeUserMarker();
  resetUserLocation();
}

// #endregion اجرای کد ها

// #region Listeners

// دکمه بازگشت به موقعیت کاربر
returnBtn.addEventListener("click", () => {
  if (userLocation.lat && userLocation.lng) {
    map.setView([userLocation.lat, userLocation.lng]); // بازگشت به موقعیت کاربر
    userMarker.setLatLng([userLocation.lat, userLocation.lng]); // حرکت مارکر به موقعیت کاربر
    console.log("User location:", userLocation);
  } else {
    showToast("موقعیت کاربر در دسترس نیست", { type: "warning" });
  }
});

map.on("click", function (e) {
  map.setView(e.latlng);
});

// بروزرسانی مختصات با حرکت نقشه
map.on("move", updateCoordinates);

// بلند شدن مارکر با حرکت نقشه
map.on("movestart", function () {
  marker.classList.add("lifting");
  outOfBorder.classList.remove("active");
});

//  پایین آمدن مارکر با توقف نقشه و حستجوی آدرس
map.on("moveend", function () {
  marker.classList.remove("lifting");
  const center = map.getCenter();
  isNeshanReverseEnabled && reverseGeocode(center.lat, center.lng);
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
    console.log("Check Country Timer Cleared");
  }
  timeoutId = setTimeout(() => {
    isNominatimReverseEnabled && checkCountry(center.lat, center.lng);
    isNominatimReverseEnabled && checkCity(center.lat, center.lng);
    console.log("Check Country Timer Set");
  }, CHECK_COUNTRY_DELAY);
});

// باز شدن صفحه جستجو با فوکوس شدن فیلد یا کلیک روی آیکون
input.addEventListener("focus", openSearchSheet);
inputBtn.addEventListener("click", openSearchSheet);

okBtn.addEventListener("click", (e) => {
  showToast("این دکمه فعلا کاری انجام نمی دهد", { type: "info" });
});

backdrop.addEventListener("click", (e) => {
  if (isModalOpen) closeModal();
  if (isSearchOpen) closeSearchSheet();
});

// انجام جستجو با پر شدن فیلد با تاخیر
searchInput.addEventListener("input", (e) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  timeoutId = setTimeout(() => {
    let inputVal = searchInput.value.trim();
    if (inputVal) {
      isNeshanSearchEnabled
        ? search(inputVal, userLocation.lat, userLocation.lng)
        : null;
    } else {
      searchInput.value = "";
      searchList.innerHTML = "";
      searchList.classList.remove("open");
      emptyState.classList.remove("open");
      displaySearchHistory();
    }
  }, SEARCH_INPUT_DELAY);
});

clearBtn.addEventListener("click", (e) => {
  searchInput.value = "";
  searchList.innerHTML = "";
  searchList.classList.remove("open");
  emptyState.classList.remove("open");
  displaySearchHistory();
});

// بسته شدن صفحه جستجو با زدن دکمه بستن
searchCloseBtn.addEventListener("click", closeSearchSheet);

// #endregion Listeners

// #region Functions

/** به‌روزرسانی مختصات در هنگام تغییر نقشه */
function updateCoordinates() {
  const center = map.getCenter();
  coordinatesDisplay.innerHTML = `Latitude: ${center.lat.toFixed(
    6
  )}, Longitude: ${center.lng.toFixed(6)}`;
}

/** به روزرسانی موقعیت کاربر */
function updateUserPosition(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;

  // ذخیره موقعیت کاربر
  userLocation = { lat: userLat, lng: userLng };

  // اگر مارکر کاربر وجود دارد، آنرا حذف کنید
  removeUserMarker();

  // افزودن مارکر جدید
  userMarker = L.marker([userLat, userLng], { icon: userMarkerIcon }).addTo(
    map
  );

  console.log("User location updated: ", userLocation);

  // حرکت نقشه به موقعیت کاربر فقط در هنگام اجرای اولیه
  if (firstLaunch) {
    // حرکت نقشه به موقعیت کاربر
    map.setView([userLat, userLng]);
    // به‌روزرسانی مختصات نمایش داده شده
    updateCoordinates();
    firstLaunch = false;
  }
}

/**
 * Show a toast message
 * @param {string} message - The message to display
 * @param {Object} options - Configuration options
 * @param {string} options.type - Toast type ('success', 'error', 'warning', 'info')
 * @param {number} options.duration - Duration in milliseconds
 */
function showToast(message, options = {}) {
  toast.show(message, options);
}

function showModal(message) {
  modal.textContent = message;
  backdrop.classList.add("active");
  modal.classList.add("open");
  isModalOpen = true;
}

function closeModal() {
  modal.textContent = "";
  backdrop.classList.remove("active");
  modal.classList.remove("open");
  isModalOpen = false;
}

function openSearchSheet() {
  searchSheet.classList.add("open");
  backdrop.classList.add("active");
  isSearchOpen = true;
  displaySearchHistory();
}

function closeSearchSheet() {
  resetSearchSheet();
  searchSheet.classList.remove("open");
  backdrop.classList.remove("active");
  isSearchOpen = false;
}

/** تبدیل مختصات به آدرس و وارد کردن آن در فیلد */
function reverseGeocode(lat, lng) {
  neshan
    .reverseGeocode(lat, lng)
    .then((data) => {
      console.log("Neshan Reverse response: ", data);
      input.value = data.formatted_address;
    })
    .catch((error) => {
      console.error("Neshan Reverse Fetch Error: ", error);
      showToast("خطایی رخ داده است لطفا دوباره امتحان کنید");
    });
}

/** جستجوی مکان و نمایش لیستی از نتایج یافت شده */
function search(term, lat, lng) {
  if (!lat || !lng) {
    lat = TEHRAN_COORDINATES[0];
    lng = TEHRAN_COORDINATES[1];
  }

  neshan
    .search(term, lat, lng)
    .then((data) => {
      console.log("Neshan Search response: ", data);
      displaySearchResult(data.items);
    })
    .catch((error) => {
      console.error("Neshan Search Fetch Error: ", error);
      showToast("خطایی رخ داده است لطفا دوباره امتحان کنید");
    });
}

/** تبدیل آدرس به مختصات و حرکت نقشه به آن */
function geocode(address) {
  neshan
    .geocode(address)
    .then((data) => {
      console.log("Neshan Geocoding response: ", data);
      // set map center to point
      const lat = data.location.y;
      const lng = data.location.x;

      map.setView([lat, lng]);
    })
    .catch((error) => {
      console.error("Neshan Geocoding Fetch Error: ", error);
      showToast("خطایی رخ داده است لطفا دوباره امتحان کنید");
    });
}

/** نمایش نتیجه جستجو بصورت لیست */
function displaySearchResult(items) {
  searchList.classList.add("open");
  searchList.innerHTML = "";
  historyList.innerHTML = ""; // پاک کردن لیست
  historyContainer.classList.remove("open");

  /* اگر نتیجه ای یافت نشد حالت خالی را فعال می کند */
  if (items.length === 0) {
    searchList.classList.remove("open");
    emptyState.classList.add("open");
    return;
  }

  /* در صورت فعال بودن حالت خالی آنرا غیر فعال می کند */
  emptyState.classList.remove("open");
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.classList.add("list-item");

    // ساخت آیکون
    const image = document.createElement("img");
    image.src = "./images/ic-location.svg";
    image.alt = "Item Image";
    image.classList.add("list-item-image");

    // افزودن آیکون به لیست آیتم
    listItem.appendChild(image);

    // ساخت کانتینر برای عنوان و آدرس
    const textContainer = document.createElement("div");
    textContainer.classList.add("text-container");

    // ساخت عنوان
    const title = document.createElement("span");
    title.textContent = item.title;

    // ساخت آدرس
    const description = document.createElement("p");
    const region = item.region ? `${item.region}، ` : "";
    const neighbourhood = item.neighbourhood ? `${item.neighbourhood}، ` : "";
    const address = item.address ? `${item.address}` : "";

    description.textContent = region + neighbourhood + address;

    const underline = document.createElement("div");
    underline.classList.add("underline");

    // افزودن عنوان و آدرس به کانتینر
    textContainer.appendChild(title);
    textContainer.appendChild(description);
    textContainer.appendChild(underline);

    // اضافه کردن کانتینر به لیست آیتم
    listItem.appendChild(textContainer);

    // تعریف رویداد کلیک لیست آیتم
    listItem.addEventListener("click", () => {
      input.value = item.address;
      map.setView([item.location.y, item.location.x]);
      addToSearchHistory(item);
      searchSheet.classList.remove("open");
      backdrop.classList.remove("active");
      resetSearchSheet();
    });

    // افزودن لیست آیتم به لیست
    searchList.appendChild(listItem);
  });
}

/** نمایش تاریخچه جستجو بصورت لیست */
function displaySearchHistory() {
  historyList.innerHTML = ""; // پاک کردن لیست
  historyList.classList.add("open");
  let searchHistory = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY));
  if (searchHistory) {
    console.log("Search history: ", searchHistory);
    historyContainer.classList.add("open");

    searchHistory.forEach((item) => {
      const historyListItem = document.createElement("li");
      const clearBtn = document.createElement("button");
      clearBtn.className = "clear-item-btn";
      historyListItem.classList.add("list-item");

      // ساخت آیکون
      const image = document.createElement("img");
      image.src = "./images/ic-history.svg";
      image.alt = "Item Image";
      image.classList.add("list-item-image");

      // افزودن آیکون به لیست آیتم
      historyListItem.appendChild(image);

      // افزودن دکمه حذف به لیست آیتم
      historyListItem.appendChild(clearBtn);

      // ساخت کانتینر برای عنوان و آدرس
      const textContainer = document.createElement("div");
      textContainer.classList.add("text-container");

      // ساخت عنوان
      const title = document.createElement("span");
      title.textContent = item.title;

      // ساخت آدرس
      const description = document.createElement("p");
      const region = item.region ? `${item.region}، ` : "";
      const neighbourhood = item.neighbourhood ? `${item.neighbourhood}، ` : "";
      const address = item.address ? `${item.address}` : "";

      description.textContent = region + neighbourhood + address;

      const underline = document.createElement("div");
      underline.classList.add("underline");

      // افزودن عنوان و آدرس به کانتینر
      textContainer.appendChild(title);
      textContainer.appendChild(description);
      textContainer.appendChild(underline);

      // اضافه کردن کانتینر به لیست آیتم
      historyListItem.appendChild(textContainer);

      // تعریف رویداد کلیک لیست آیتم
      historyListItem.addEventListener("click", () => {
        input.value = item.address;
        map.setView([item.location.y, item.location.x]);
        searchSheet.classList.remove("open");
        backdrop.classList.remove("active");
        resetSearchSheet();
      });

      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromHistory(item);
        displaySearchHistory();
      });

      // افزودن لیست آیتم به لیست
      historyList.appendChild(historyListItem);
    });
  } else {
    console.log("search history is empty");
    historyContainer.classList.remove("open");
  }
}

// افزودن به تاریخچه جستجو
function addToSearchHistory(item) {
  // فراخوانی تاریخچه جستجو و در صورت نبودن ساخت یک آرایه خالی
  let searchHistory =
    JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];

  // افزودن آیتم به تاریخچه جستجو
  searchHistory = [...searchHistory, item];

  // ذخیره تاریخچه جستجو در لوکال استوریج
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
}

/**
 * Removes a specific item from search history
 * @param {Object} itemToRemove - The item to remove from history
 * @returns {boolean} - Returns true if item was successfully removed
 */
function removeFromHistory(itemToRemove) {
  try {
    // Get current history from localStorage
    let searchHistory =
      JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];

    searchHistory = searchHistory.filter(
      (item) =>
        item.location.x !== itemToRemove.location.x ||
        item.location.y !== itemToRemove.location.y
    );

    // Update localStorage
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));

    // If history is now empty, hide the history container
    if (searchHistory.length === 0) {
      historyContainer.classList.remove("open");
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
  } catch (error) {
    console.error("Error removing item from history: ", error);
  }
}

function clearAllSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/** اگر مارکر کاربر وجود دارد، آنرا حذف می کند و در موقعیت جدید قرار می دهد*/
function removeUserMarker() {
  if (userMarker) {
    map.removeLayer(userMarker);
  }
}

/** موقعیت کاربر را ریست می کند */
function resetUserLocation() {
  userLocation = { lat: null, lng: null };
}

/** مقادیر موجود در صفحه جستجو را ریست می کند */
function resetSearchSheet() {
  searchInput.value = "";
  searchList.innerHTML = "";
  historyList.innerHTML = "";
  emptyState.classList.remove("open");
}

/** چک کردن کشور */
function checkCountry(lat, lng) {
  nominatim
    .reverseGeocode(lat, lng)
    .then((data) => {
      console.log("Nominatim Reverse response: ", data);
      const country = data?.address?.country;
      const countryCode = data?.address?.country_code;
      if (countryCode !== "ir") {
        console.log(
          "Check Country from Fetch: ",
          `You are now viewing ${country}, outside of Iran`
        );
        outOfBorder.classList.add("active");
      } else {
        outOfBorder.classList.remove("active");
      }
    })
    .catch((error) => {
      console.error("Nominatim Reverse Fetch Error: ", error);
      showToast("خطایی رخ داده است لطفا دوباره امتحان کنید");
    });
}

function checkCity(lat, lng) {
  nominatim
    .reverseGeocode(lat, lng)
    .then((data) => {
      console.log("Nominatim Reverse response: ", data);
      const city = data?.address?.city;
      if (city !== "Tabriz" && city !== "Zanjan") {
        console.log(
          "Check City from Fetch: ",
          `You are now viewing ${city}, outside of Tehran`
        );
        outOfBorder.classList.add("active");
      } else {
        outOfBorder.classList.remove("active");
      }
    })
    .catch((error) => {
      console.error("Nominatim Reverse Fetch Error: ", error);
      showToast("خطایی رخ داده است لطفا دوباره امتحان کنید");
    });
}

function setMapBoundsForCity(cityName) {
  const city = CITIES_BOUNDS[cityName.toLowerCase()];
  if (!city) return;

  const cityBounds = L.latLngBounds([
    [city.bounds.south, city.bounds.west],
    [city.bounds.north, city.bounds.east],
  ]);

  map.setMaxBounds(cityBounds);
  map.fitBounds(cityBounds);
}

// Check if point is within bounds
function isPointInBounds(lat, lng) {
  return bounds.contains(L.latLng(lat, lng));
}

// #endregion Functions
