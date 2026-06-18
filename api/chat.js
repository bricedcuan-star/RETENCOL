<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RETENCOL | Calculadora Especializada</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<style>
    :root {
        --brand-primary: #0b2a59;
        --brand-accent: #2a9d59;
        --bg-main: #f4f7f6;
        --text-main: #1e293b;
    }
    body { font-family: 'Inter', sans-serif; background: var(--bg-main); color: var(--text-main); margin: 0; padding: 20px; }
    .container { max-width: 900px; margin: auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    h1 { color: var(--brand-primary); }
    .btn { padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.3s; }
    .btn-primary { background: var(--brand-primary); color: white; }
    .btn-accent { background: var(--brand-accent); color: white; }
    
    /* Valentina Chat */
    .chat-container { border: 2px solid var(--brand-primary); border-radius: 12px; margin-top: 20px; overflow: hidden; }
    .chat-header { background: var(--brand-primary); color: white; padding: 15px; font-weight: 600; }
    .chat-messages { height: 250px; overflow-y: auto; padding: 15px; background: #f9f9f9; }
    .chat-input { padding: 15px; display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; }
    
    /* Exportación */
    .actions { margin-top: 20px; display: flex; gap: 10px; }
</style>
</head>
<body>

<div class="container">
    <h1>RETENCOL Pro</h1>
    <p>Calculadora especializada y guía tributaria inteligente.</p>

    <!-- Módulo Valentina IA -->
    <div class="chat-container">
        <div class="chat-header">Valentina IA | Tu Asistente Tributaria</div>
        <div class="chat-messages" id="chat-box">
            <p><strong>Valentina:</strong> ¡Hola! Soy tu asistente de RETENCOL. Puedes preguntarme sobre SAS, retenciones, o casos específicos. ¿En qué te ayudo hoy?</p>
        </div>
        <div class="chat-input">
            <input type="text" id="user-input" placeholder="Ej: ¿Retención a diseñador persona natural?">
            <button class="btn btn-primary" onclick="enviarMensaje()">Preguntar</button>
        </div>
    </div>

    <!-- Acciones Pro -->
    <div class="actions">
        <button class="btn btn-primary" onclick="exportar('PDF')"><i class="ti ti-file-type-pdf"></i> Descargar Informe PDF</button>
        <button class="btn btn-accent" onclick="exportar('Excel')"><i class="ti ti-table-export"></i> Exportar a Excel</button>
    </div>
</div>

<script>
    function enviarMensaje() {
        const input = document.getElementById('user-input');
        const chat = document.getElementById('chat-box');
        const mensaje = input.value.toLowerCase();
        
        if (mensaje.trim() === "") return;
        
        chat.innerHTML += `<p><strong>Tú:</strong> ${input.value}</p>`;
        
        let respuesta = "Valentina: Estoy analizando tu caso bajo la normativa vigente. ";
        if (mensaje.includes("diseñador")) {
            respuesta += "Si es persona natural, verifica si la labor es intelectual (Honorarios 10%-11%) o servicio general (4%). ¿Deseas realizar el cálculo exacto?";
        } else if (mensaje.includes("sas")) {
            respuesta += "Las SAS son sociedades comerciales. Su retención depende de la actividad económica y si es declarante o no.";
        } else {
            respuesta += "Te recomiendo revisar el Decreto 1625/2016 para mayor detalle. ¿Quieres que profundicemos en algún concepto?";
        }
        
        chat.innerHTML += `<p><strong>${respuesta}</strong></p>`;
        input.value = '';
        chat.scrollTop = chat.scrollHeight;
    }

    function exportar(tipo) {
        alert("Generando archivo " + tipo + " con tu identidad de marca...");
    }
</script>

</body>
</html>
