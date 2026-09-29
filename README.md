# A paso ganador

Aplicación de demostración con registro local, inicio de sesión,
estadísticas simuladas y recargas de saldo mediante una API ficticia.

## Tecnologías

- Frontend: React, TypeScript, Vite y Recharts.
- Backend: Express y TypeScript.
- Persistencia: LocalStorage del navegador.
- Pruebas: Vitest, Supertest y jsdom.

## Requisitos

- Node.js y npm.
- Un navegador moderno con LocalStorage y Web Crypto disponibles.

Las versiones utilizadas durante el desarrollo se indican al final
de este documento.

## Instalación y ejecución

Desde la carpeta principal, abrir dos terminales.

### Terminal 1: backend

```bash
cd backend
npm ci
npm run dev
```

El servidor escucha en http://localhost:3001.

Comprobación de disponibilidad:
http://localhost:3001/api/health

### Terminal 2: frontend

```bash
cd frontend
npm ci
npm run dev
```

Abrir la dirección indicada por Vite, normalmente:
http://localhost:5173

Mantener ambas terminales abiertas. Vite redirige las solicitudes
de /api al backend mediante su proxy de desarrollo.

## Uso

1. Registrar una cuenta con nombre, correo y contraseña.
2. Acceder al dashboard.
3. Consultar las estadísticas y realizar recargas ficticias.
4. Cerrar sesión y volver a entrar con las credenciales registradas.

Se admite una cuenta por origen del navegador. El perfil, la sesión,
el saldo y los comprobantes aprobados se conservan en LocalStorage.

Para reiniciar la demostración, eliminar las claves snail-user y
snail-session desde las herramientas del navegador. Esto elimina
la cuenta y el saldo local.

## Escenarios de SnailPay

En todos los escenarios:

- Vencimiento: 12/26.
- CVV ficticio: 543.
- Nombre del titular: cualquier texto no vacío.
- Monto: mayor que cero, máximo 100000 MXN y hasta dos decimales.
- El identificador y correo del usuario se toman de la sesión.

| Escenario         | Tarjeta ficticia | Modo                             | Resultado                                              |
| ----------------- | ---------------- | -------------------------------- | ------------------------------------------------------ |
| Aprobación        | 1234123412341234 | Funcionamiento normal            | HTTP 200; aumenta el saldo                             |
| Rechazo           | 4000000000000002 | Funcionamiento normal            | HTTP 422; saldo sin cambios                            |
| Error del sistema | 1234123412341234 | Simular error del sistema        | HTTP 503; saldo sin cambios                            |
| Tiempo de espera  | 1234123412341234 | Simular tiempo de espera agotado | El cliente cancela a los 5 segundos; saldo sin cambios |

En el modo de tiempo de espera, el backend espera 10 segundos
y responde HTTP 504 si la conexión sigue disponible. Nunca aprueba
esa operación.

La API rechaza con HTTP 400 los datos inválidos, como montos negativos,
campos obligatorios vacíos o tarjetas fuera del catálogo ficticio.

## API

POST /api/payments

Campos de solicitud:

- card_number
- expiration_date
- cvv
- full_name
- transaction_amount
- payer_id
- payer_email
- simulation: normal, system_error o timeout

Campos de respuesta:

- id: identificador UUID de la operación.
- status: approved, rejected o error.
- status_detail: mensaje descriptivo.
- transaction_amount: monto solicitado o null si no es numérico.
- date_created: fecha en formato ISO.
- authorization_code: identificador de autorización o null.
- reference: referencia con prefijo SIM-.
- payer_id y payer_email: datos del usuario.
- card_number y cvv: valores ficticios permitidos o null.

La API no mantiene un saldo. El frontend valida la aprobación y
guarda el saldo junto con el comprobante en una sola actualización
de LocalStorage. Una operación con el mismo id no se acredita dos veces.

## Estadísticas simuladas

Se representan seis carreras con un ganador por carrera:

- Turbo: 2 victorias.
- Rayo: 1 victoria.
- Canela: 0 victorias.
- Flecha: 2 victorias.
- Luna: 1 victoria.
- Trueno: 0 victorias.

Las apuestas representan cuatro ganadas y dos perdidas.
Son datos fijos de demostración y no modifican el saldo.
No se ejecutan carreras ni apuestas reales.

## Pruebas automatizadas

Backend, desde su carpeta:

```bash
npx vitest run
```

Frontend, desde su carpeta:

```bash
npx vitest run
```

Las 15 pruebas del backend cubren aprobaciones, rechazos,
errores del servicio, validaciones y estructura de respuestas.

Las 12 pruebas del frontend cubren registro, sesión, almacenamiento,
recargas, prevención de acreditación duplicada y precisión decimal.

También se verificaron manualmente la persistencia al recargar
la página y los escenarios de aprobación, rechazo, error y timeout.

## Compilación y revisión

Frontend:

```bash
npm run build
npm run lint
```

Backend:

```bash
npm run build
```

Para ejecutar el backend compilado:

```bash
npm start
```

Detener primero cualquier otro backend que ocupe el puerto 3001.

El proxy descrito corresponde al servidor de desarrollo de Vite.
Un despliegue requiere configurar el enrutamiento de /api al backend.

## Seguridad y límites

- Es una simulación local, no un sistema de autenticación de producción.
- Las contraseñas se derivan con PBKDF2-SHA256, 600000 iteraciones
  y una sal aleatoria por usuario; no se guardan en texto legible.
- LocalStorage puede modificarse desde el navegador. El saldo y
  la sesión no son una autoridad segura para operaciones reales.
- Se utilizan exclusivamente tarjetas y CVV ficticios.
- Los comprobantes aprobados conservan esos datos ficticios localmente.
  Este comportamiento no es apropiado para pagos reales.
- No hay integración con servicios financieros ni base de datos.
- La compilación del frontend muestra un aviso por el tamaño del
  paquete JavaScript. No impide compilar ni ejecutar la aplicación.

## Uso de inteligencia artificial

Utilicé ChatGPT/Codex como apoyo para analizar los requisitos,
organizar el proyecto, generar código, resolver errores y preparar
pruebas y documentación.

Integré la solución por etapas en Visual Studio Code y comprobé
su funcionamiento en el navegador. Probé el registro, el inicio
y cierre de sesión, la persistencia del saldo y los distintos
resultados de las recargas. También solicité ajustes de interfaz
y apliqué correcciones con apoyo de la herramienta.

Para validar el resultado, ejecuté las pruebas automatizadas,
la compilación del frontend y backend y la revisión con ESLint.

## Versiones utilizadas

- Node.js: 22.18.0
- npm: 10.9.3
- Git: 2.50.1.windows.1
