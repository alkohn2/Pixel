# Protocolo de Control Manual Seguro para Volleyball Control2 (Propuesta de Diseño Técnico Actualizada)

---

## 🎯 1. Principios Fundamentales y Arquitectura

### Fuente Única de Verdad y Lógica de Reglas
- **Volleyball Control2** (`volleyball-control.html`) es y continuará siendo la **fuente única de verdad** para la lógica deportiva de voleibol, estado del partido y mantenimiento de marcadores.
- **Aclaración sobre Reglas**: Volleyball Control2 conserva y aplica su propia lógica de reglas; la cobertura de reglas se verificará mediante pruebas de laboratorio.
- **Vento V1** opera como un cliente companion de realización que **nunca escribe directamente** en la clave `localStorage.setItem('mdcVolleyballMatchStateV1', ...)` ni altera la memoria del marcador.

### Seguridad y Aislamiento de Origen (BroadcastChannel)
- El uso de `BroadcastChannel` bajo el mismo origen (`http://localhost:8000/`) protege eficazmente contra errores accidentales de despliegue (ej. fuga de comandos entre diferentes puertos u orígenes cruzados), pero **no sustituye la autenticación ni la seguridad a nivel de red**.

---

## 🔄 2. Contrato Reforzado: Request / Ack / Estado Real

El protocolo establece un ciclo estricto de **Solicitud -> Validación -> Respuesta Acknowledgment -> Transmisión de Estado Real**:

```
+-----------------------------------------------------------------------------------+
| VENTO V1 (Cliente de Control Manual)                                             |
|   1. Acción del Operador (ej. Botón Grande "+1 Point Home" con debounce 800ms)    |
|   2. Genera CommandPayload { commandId, action, params, timestamp, protocolVersion }|
|   3. Registra en Audit Log Local: STATUS_REQUESTED                                |
|   4. Inicia temporizador de timeout (3000 ms, sin reintentos automáticos)         |
|   5. Publica en BroadcastChannel('mdc-volleyball-cmd-channel')                    |
+---------------------------------------+-------------------------------------------+
                                        |
                                        v  (BroadcastChannel Mismo Origen)
+---------------------------------------+-------------------------------------------+
| VOLLEYBALL CONTROL2 (volleyball-control.html - Servidor de Marcador)              |
|   6. Recibe CommandPayload en BroadcastChannel                                   |
|   7. Aplica su propia lógica de reglas y valida la acción                         |
|   8. ¿ACEPTADO? -> Incrementa stateRevision / timestamp y muta su estado local   |
|   9. Persiste en localStorage('mdcVolleyballMatchStateV1')                        |
|  10. Publica nuevo estado en BroadcastChannel('mdc-volleyball-live-state')        |
|  11. Envía respuesta Acknowledgment en BroadcastChannel('mdc-volleyball-cmd-channel'):|
|      { commandId, status: 'ACCEPTED' | 'REJECTED', reason: '', protocolVersion }  |
+---------------------------------------+-------------------------------------------+
                                        |
                                        v
+---------------------------------------+-------------------------------------------+
| VENTO V1 (Receptor Pasivo)                                                        |
|  12. Recibe Ack match (commandId) -> Actualiza Audit Log (STATUS_ACCEPTED / REJECTED)|
|  13. Recibe nuevo estado real publicado con revisión/timestamp actualizado        |
|  14. Muestra la acción como confirmada en la interfaz                             |
+-----------------------------------------------------------------------------------+
```

### Estructura de Mensajes:

1. **`CommandPayload` (Vento ➔ Control2)**:
   ```json
   {
     "protocolVersion": "1.0",
     "commandId": "cmd_1786458900000_a8f9",
     "action": "ADD_POINT",
     "params": { "team": "home" },
     "timestamp": 1786458900000,
     "operatorId": "vento_director_1"
   }
   ```

2. **`CommandAck` (Control2 ➔ Vento)**:
   ```json
   {
     "protocolVersion": "1.0",
     "commandId": "cmd_1786458900000_a8f9",
     "status": "ACCEPTED", // 'ACCEPTED' | 'REJECTED'
     "reason": "OK",
     "timestamp": 1786458900050
   }
   ```

3. **`VolleyballMatchState` Publicado**:
   - Incluye siempre una revisión de estado incrementada (`stateRevision`) o un nuevo timestamp (`timestamp`).
   - Vento **solo confirma visualmente la acción** cuando recibe el Ack `ACCEPTED` correspondiente a su `commandId` **Y** la emisión posterior del nuevo estado real.

---

## 📋 3. Política de Confirmaciones y Experiencia del Operador

### Interruptor de Sesión y Advertencia Inicial:
- El modo de control inicia **desactivado por defecto** (`READ-ONLY`).
- Al activar el interruptor *"Habilitar Control Manual"*, se despliega una **pantalla/modal de advertencia explícita**:
  *"Se activará la transmisión de comandos hacia Volleyball Control2 en esta sesión. ¿Deseas continuar?"*
- La activación aplica exclusivamente para la sesión activa del navegador.

### Matriz de Acciones y Políticas de Confirmación:

| Acción (`action`) | Tipo de Interfaz en Vento | Política de Confirmación / Bloqueo |
|---|---|---|
| `ADD_POINT` (`home` / `away`) | Botón grande de acción rápida | **Sin modal por cada punto**. Bloqueo electrónico de doble clic de 800 ms (`debounce`). Confirmación visual inmediata en botón y confirmación definitiva al recibir el nuevo estado real. |
| `SUB_POINT` (`home` / `away`) | Botón de corrección de puntos | **Confirmación explícita previa** mediante cuadro modal: *"¿Corregir y restar 1 punto a [EQUIPO]?"* |
| `TOGGLE_SERVE` (`home` / `away`) | Botón de cambio de saque | **Confirmación explícita previa** mediante cuadro modal: *"¿Cambiar el saque activo a [EQUIPO]?"* |
| `TOGGLE_OVERLAY` (`show` / `hide`) | Botón de visibilidad | **Confirmación explícita previa** mediante cuadro modal: *"¿Mostrar/Ocultar el marcador en emisión?"* |
| `UNDO_ACTION` | Botón de deshacer | **Confirmación explícita previa** destacada: *"¿Deshacer la última acción registrada en el partido?"* |

### Acciones Excluidas Estrictamente:
- ❌ **`RESET_MATCH`**: Reinicio de partido (excluido de Vento).
- ❌ **`FINISH_SET`**: Cierre de set (excluido de Vento).
- ❌ **Edición Estructural**: Modificación de nombres, colores o configuración de equipos (excluido de Vento).

---

## 🛡️ 4. Salvaguardas, Auditoría y Tiempos Limite

1. **Tiempo Máximo de Espera (Timeout 3s)**:
   - Al emitir un `commandId`, Vento espera un máximo de **3000 ms** para recibir la respuesta `CommandAck`.
   - Si se supera el límite de 3 segundos, Vento marca el comando como `EXPIRED` en el registro de auditoría local y muestra un aviso visual: *"Sin respuesta de Volleyball Control2 (Comando Expirado)"*.
   - **Sin reintentos automáticos**.

2. **Registro de Auditoría Local (`vento_v1_volleyball_audit_log`)**:
   - Registra en memoria/storage de Vento: `commandId`, `timestamp`, `action`, `params`, `status` (`REQUESTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`), `reason` y `operatorId`.

3. **Independencia de la Consola Original**:
   - La consola `volleyball-control.html` continuará operando de forma autónoma e independiente, incluso si Vento está cerrado o desconectado.

---

## 🧪 5. Plan de Pruebas de Laboratorio Recomendado (Fase Futura)

1. **Prueba 1 (Verificación de Reglas e Integración de Punto)**:
   - Pulsar botón grande `+1 Point Home`. Verificar bloqueo de 800ms, emisión de `CommandPayload`, respuesta `ACCEPTED`, incremento de `stateRevision` y actualización visual en Vento.
2. **Prueba 2 (Rechazo de Comando por Debounce)**:
   - Simular envío doble en menos de 800ms. Verificar que Control2 emite `REJECTED` para el segundo comando y Vento registra el rechazo sin corromper el marcador.
3. **Prueba 3 (Expiración por Timeout de 3 Segundos)**:
   - Desconectar `volleyball-control.html` y enviar `SUB_POINT`. Verificar expiración limpia tras 3000ms sin reintentos automáticos ni congelamiento de interfaz.
