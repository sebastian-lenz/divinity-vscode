(function() {
  const vscode = acquireVsCodeApi();
  const location = document.body.getAttribute("data-location");
  let hasProgress = false;

  // Send state to vscode
  vscode.setState({ location: location });

  // Execute a command
  function executeCommand(command, args) {
    vscode.postMessage({
      command: command,
      args: args
    });

    if (!hasProgress) {
      const el = document.createElement("div");
      el.className = "divinityProgress";
      el.innerHTML = [
        '<div class="divinityProgress--line inc"></div>',
        '<div class="divinityProgress--line dec"></div>'
      ].join("");

      document.body.appendChild(el);
      hasProgress = true;
    }
  }

  document.addEventListener("click", function(event) {
    var target = event.target;
    while (target && target.getAttribute) {
      var goto = target.getAttribute("data-goto");
      if (goto) {
        executeCommand("goto", [goto]);
        event.preventDefault();
        break;
      }

      target = target.parentNode;
    }
  });
})();
