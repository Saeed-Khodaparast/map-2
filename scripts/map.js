$(document).ready(function () {
  var app = new Mapp({
    element: "#map",
    presets: {
      latlng: {
        lat: 38.074109,
        lng: 46.29626,
      },
      zoom: 13,
    },
    apiKey:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijg0MmMyOTQ5YjI1NTVlZjNlOGE2YTVjMTk0NmEwMzJkYWJmZTgyNDlkNTEwYThlZjYzZTU4MzA2ZmRhZmIwMzYxOGNhMmZlYjgzNmI1NTNlIn0.eyJhdWQiOiIzMDAyMyIsImp0aSI6Ijg0MmMyOTQ5YjI1NTVlZjNlOGE2YTVjMTk0NmEwMzJkYWJmZTgyNDlkNTEwYThlZjYzZTU4MzA2ZmRhZmIwMzYxOGNhMmZlYjgzNmI1NTNlIiwiaWF0IjoxNzM0MDA0OTU4LCJuYmYiOjE3MzQwMDQ5NTgsImV4cCI6MTczNjUxMDU1OCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.hWslQCgvkmZmhKVZtZyZue_thd5iMZZmIX1sA9l_E69FecB9_xcKxDbt6ROEHVRHCQspZ98efTIj99Pm-1WY8ClVcu7ondAvjgfrSz_Q6hlocTFjcj_rncW_5vWu19RHX53NkJLO9c4IT1hBVayo8OQKuJfg4R3MfT7OvyUric3AxwDdI5AHd_RRlUVDYSXgJLSfwDUA3EE7EzSuN-1X9aNUCzVvQ60KYhBVAAKDF_IGwvKI4UQMARE0DnqgdTU2fTs_-evahBWTOF6e3W1dsTqDykJFXTGJZ7-Ev7WEspC4GjlVVW8sWZvhq-6zgxqX9l6XSqZxdUV-0cSoe1K1Ew",
  });
  app.addLayers();
});
