/* 
  Client che gestisce la dashboard di amministrazione, dalla quale è possibile generare
  le notizie tramite l'esecuzione di uno script. L'esecuzione dello script è osservabile
  dai messaggi di log stampati in tempo reale sulla console della pagina.
  
  L'esecuzione dello script richiede l'inserimento di una API key valida (fornita da OpenAI).
*/

$(document).ready(function () {
  // Al click sul pulsante "Generate News"
  $("#startScriptBtn").click(function () {
    let apiKey = $("#apiKey").val();

    // Se è stata inserita un'API key
    if (apiKey.length > 0) {
      $("#consoleOutput").val("");

      // L'API key viene inviata al server, che la passerà tramite linea di comando per l'esecuzione dello script newsGenerator.js
      $.ajax({
        url: "/newsGenerator",
        type: "POST",
        data: JSON.stringify({ apiKey: apiKey }),
        contentType: "application/json",
        timeout: 0,
        success: function (response) {
          // La key è valida e lo script sta eseguendo
          // Inserisce nella console il response ricevuto, ovvero i messaggi di log dello script newsGenerator.js
          let consoleOutput = $("#consoleOutput");
          let currentText = consoleOutput.val();
          consoleOutput.val(currentText + response);

          $.ajax({
            url: "/resetVote",
            type: "GET",
            success: function () {
              console.log("Vote reset successful");
            },
            error: function (jqXHR, textStatus, errorThrown) {
              console.error("Error resetting vote:", textStatus, errorThrown);
            },
          });
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error("Error:", textStatus, errorThrown);
        },
        xhrFields: {
          // I messaggi di log vengono ricevuti e stampati "live" durante l'esecuzione
          onprogress: function (e) {
            if (e.currentTarget.responseText !== "") {
              let consoleOutput = $("#consoleOutput");
              consoleOutput.val(e.currentTarget.responseText);
            }
          },
        },
      });
    } else {
      // Avvisa di inserire una API key
      const alertMessage = $('<div class="alert alert-danger mt-1">Insert a valid API key</div>');
      $("#inputKey").after(alertMessage);

      setTimeout(() => {
        alertMessage.remove();
      }, 3000);
    }
  });
});
