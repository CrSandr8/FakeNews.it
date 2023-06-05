// Widget per il meteo, che richiede la posizione quando si accede per la prima volta nella sessione al sito

$(document).ready(() => {
  let weatherData = "";

  const updateWeather = (data) => {
    $.ajax({
      url: "/weather",
      method: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      success: function (response) {
        weatherData = response;
        $("#weather").html(weatherData);
      },
      error: function (error) {
        console.error("Error fetching weather data:", error);
      },
    });
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        updateWeather(data);
      },
      (error) => {
        console.error("Geolocation Error:", error);
      }
    );
  } else {
    console.error("Geolocation not supported by this browser.");
  }
});
