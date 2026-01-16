# AWS SES Troubleshooting Guide

## Problema Común: AWS SES en Modo Sandbox

Cuando AWS SES está en **modo sandbox**, solo puedes enviar emails a:
- Direcciones de email verificadas
- Dominios verificados
- Tu propio email

### Solución 1: Verificar el Email del Usuario en AWS SES

1. Ve a AWS SES Console: https://console.aws.amazon.com/ses/
2. En el menú lateral, selecciona **Verified identities**
3. Click en **Create identity**
4. Selecciona **Email address**
5. Ingresa: `joseestebanvilela@gmail.com`
6. Click **Create identity**
7. El usuario recibirá un email de verificación de AWS

### Solución 2: Salir del Modo Sandbox (Recomendado para Producción)

1. Ve a AWS SES Console
2. En el menú lateral, busca **Account dashboard**
3. Verás un banner que dice "Your account is in the sandbox"
4. Click en **Request production access**
5. Completa el formulario:
   - **Mail Type**: Transactional
   - **Website URL**: https://soylazo.com
   - **Use case description**: 
     ```
     We are a clinical support platform that sends transactional emails to healthcare professionals:
     - Account verification emails
     - Password reset emails
     - Subscription notifications
     - Session notifications
     
     We expect to send approximately 100-500 emails per day initially.
     ```
   - **Compliance**: Confirma que cumples con las políticas
6. Submit request (generalmente se aprueba en 24 horas)

### Solución 3: Verificar Configuración en Supabase

1. Ve a Supabase Dashboard
2. **Project Settings** → **Auth** → **SMTP Settings**
3. Verifica que tengas:
   ```
   Host: email-smtp.[region].amazonaws.com
   Port: 587 (o 465 para SSL)
   Username: [Tu SMTP Username de AWS]
   Password: [Tu SMTP Password de AWS]
   Sender email: noreply@soylazo.com (o tu dominio verificado)
   Sender name: Lazo
   ```

### Solución 4: Verificar el Dominio en AWS SES

Si quieres enviar desde `@soylazo.com`:

1. Ve a AWS SES Console → **Verified identities**
2. Click **Create identity** → **Domain**
3. Ingresa: `soylazo.com`
4. Sigue las instrucciones para agregar registros DNS (CNAME, TXT, MX)
5. Espera a que se verifique (puede tomar hasta 72 horas)

## Problema con Google Workspace

Si el problema es específico con Google Workspace:

### Verificar SPF, DKIM, DMARC

Asegúrate de tener estos registros DNS configurados:

```dns
# SPF Record
TXT @ "v=spf1 include:_spf.google.com include:amazonses.com ~all"

# DMARC Record
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:postmaster@soylazo.com"
```

### Verificar que AWS SES tenga DKIM configurado

1. En AWS SES Console → **Verified identities**
2. Selecciona tu dominio
3. En la pestaña **Authentication**, asegúrate que DKIM esté **Successful**

## Solución Temporal: Deshabilitar Confirmación de Email

Mientras resuelves el problema de AWS SES, puedes deshabilitar la confirmación de email:

### En Supabase Dashboard:
1. **Authentication** → **Providers** → **Email**
2. Desactiva **"Confirm email"**
3. Save

### O manualmente confirmar usuarios existentes:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email = 'joseestebanvilela@gmail.com';
```

## Verificar Logs de AWS SES

Para ver qué está pasando:

1. Ve a AWS CloudWatch
2. Busca logs de SES: `/aws/ses/`
3. Revisa los errores recientes

## Contacto AWS Support

Si nada funciona, contacta AWS Support:
- Verifica que tu cuenta AWS no tenga restricciones
- Verifica que no estés en una región no soportada
- Verifica que tu billing esté activo
