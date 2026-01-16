# Configurar Resend para Emails en Supabase

## ¿Por qué Resend?

- ✅ **Fácil de configurar** (5 minutos)
- ✅ **Tier gratuito generoso**: 100 emails/día, 3,000/mes
- ✅ **No requiere aprobación** como AWS SES
- ✅ **Excelente deliverability**
- ✅ **API moderna y simple**

## Paso 1: Crear Cuenta en Resend

1. Ve a: https://resend.com/signup
2. Crea tu cuenta (gratis)
3. Verifica tu email

## Paso 2: Obtener API Key

1. Una vez logueado, ve a: https://resend.com/api-keys
2. Click en **"Create API Key"**
3. Nombre: `Lazo Production`
4. Permissions: **"Sending access"**
5. Click **"Add"**
6. **COPIA LA API KEY** (solo se muestra una vez)
   - Formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Paso 3: Verificar tu Dominio (Opcional pero Recomendado)

### Opción A: Usar dominio propio (soylazo.com)

1. Ve a: https://resend.com/domains
2. Click **"Add Domain"**
3. Ingresa: `soylazo.com`
4. Resend te dará registros DNS para agregar:

```dns
# SPF Record
TXT @ "v=spf1 include:_spf.resend.com ~all"

# DKIM Records (Resend te dará los valores específicos)
TXT resend._domainkey "p=MIGfMA0GCSq..."
TXT resend2._domainkey "p=MIGfMA0GCSq..."

# DMARC Record
TXT _dmarc "v=DMARC1; p=none; rua=mailto:postmaster@soylazo.com"
```

5. Agrega estos registros en tu proveedor DNS (GoDaddy, Cloudflare, etc.)
6. Espera 24-48 horas para verificación
7. Una vez verificado, podrás enviar desde `noreply@soylazo.com`

### Opción B: Usar dominio de Resend (Rápido para testing)

Si no quieres configurar DNS ahora, Resend te permite usar su dominio:

- Emails se enviarán desde: `onboarding@resend.dev`
- Funciona inmediatamente, sin configuración DNS

## Paso 4: Configurar SMTP en Supabase

1. Ve a tu Supabase Dashboard
2. **Project Settings** → **Auth** → **SMTP Settings**
3. Habilita **"Enable Custom SMTP"**
4. Ingresa estos valores:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [TU_API_KEY_DE_RESEND] (la que copiaste en Paso 2)

Sender email: noreply@soylazo.com
              (o onboarding@resend.dev si no verificaste dominio)
Sender name: Lazo
```

5. Click **"Save"**

## Paso 5: Probar el Envío

1. En Supabase Dashboard, ve a **Authentication** → **Providers** → **Email**
2. Asegúrate que **"Confirm email"** esté ACTIVADO
3. Intenta registrar un nuevo usuario en tu app
4. Deberías recibir el email de confirmación

## Paso 6: Personalizar Email Templates en Supabase

1. Ve a: **Authentication** → **Email Templates**
2. Personaliza los templates:
   - **Confirm signup**: Email de verificación
   - **Magic Link**: Login sin contraseña
   - **Change Email Address**: Cambio de email
   - **Reset Password**: Recuperar contraseña

### Template Variables Disponibles:

```html
{{ .ConfirmationURL }} - URL de confirmación {{ .Token }} - Token de
verificación {{ .TokenHash }} - Hash del token {{ .SiteURL }} - URL de tu sitio
{{ .Email }} - Email del usuario
```

## Verificar que Funciona

### En Resend Dashboard:

1. Ve a: https://resend.com/emails
2. Verás todos los emails enviados
3. Puedes ver el status: `delivered`, `bounced`, `complained`, etc.

### En Supabase:

1. Ve a **Authentication** → **Users**
2. Verifica que el usuario aparezca con `email_confirmed_at` populated

## Troubleshooting

### Error: "Invalid API Key"

- Verifica que copiaste la API key completa
- Debe empezar con `re_`
- Asegúrate de no tener espacios extra

### Emails no llegan

- Revisa spam/junk folder
- Verifica en Resend Dashboard si el email fue enviado
- Si usas dominio propio, verifica que esté verificado

### "Domain not verified"

- Si usas `noreply@soylazo.com`, debes verificar el dominio primero
- Mientras tanto, usa `onboarding@resend.dev`

## Costos

### Plan Gratuito:

- 100 emails/día
- 3,000 emails/mes
- Todos los features

### Plan Pro ($20/mes):

- 50,000 emails/mes
- $1 por cada 1,000 adicionales
- Soporte prioritario

## Migración desde AWS SES

Si ya tenías templates en AWS SES:

1. Los templates HTML que tienes en `server/email-templates/` funcionarán igual
2. Solo necesitas actualizar las variables si usas sintaxis diferente
3. Resend usa las mismas variables que Supabase: `{{ .ConfirmationURL }}`

## Siguiente Paso

Una vez configurado Resend, **desactiva AWS SES en Supabase** para evitar conflictos:

1. **Project Settings** → **Auth** → **SMTP Settings**
2. Asegúrate que esté usando Resend, no AWS SES
