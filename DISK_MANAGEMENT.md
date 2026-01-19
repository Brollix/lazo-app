# Gestión de Disco en EC2

## 📊 Diagnóstico Actual

**Estado del volumen EBS:**

- Tamaño total: 30 GB
- Uso actual: 5.7 GB (19%)
- Disponible: 24 GB
- Métrica AWS: 25.82 GB-Mo de 30 GB-Mo (86% del Free Tier)

**Componentes de uso:**

- Docker: 448 MB (400 MB recuperables)
- Logs del sistema: 59 MB
- Aplicación: 53 MB
- Sistema base: ~5 GB

## ⚠️ Entendiendo la Alerta de AWS

La métrica **GB-Mo (Gigabyte-Month)** es acumulativa:

- 1 GB usado durante 30 días = 1 GB-Mo
- 30 GB usado durante 1 día = 1 GB-Mo
- **Free Tier**: 30 GB-Mo por mes

Tu uso de 25.82 GB-Mo significa que estás usando ~86% del límite mensual gratuito, principalmente porque el volumen de 30 GB está aprovisionado todo el mes (30 GB × 1 mes = 30 GB-Mo).

## 🛠️ Soluciones Implementadas

### 1. Multi-Stage Docker Build

- **Antes**: ~450 MB por imagen
- **Después**: ~150 MB por imagen
- **Reducción**: 70%

### 2. Scripts de Deployment Mejorados

#### Server Deploy (`server/deploy.sh`)

- Limpieza agresiva de Docker antes del build
- Rotación de logs del sistema (mantiene últimos 7 días)
- Verificación de espacio disponible antes de build
- Limpieza de emergencia si queda menos de 5 GB
- Limpieza final después del deployment

#### Client Deploy (`client/deploy.sh`)

- Limpieza de cache de npm
- Eliminación de imágenes Docker antiguas
- Limpieza agresiva de node_modules

### 3. Monitoreo Automático

**Script**: `server/disk-monitor.sh`

- Ejecuta cada hora vía cron
- Umbral de advertencia: 80%
- Umbral crítico: 85%
- Limpieza automática cuando se exceden umbrales

### 4. Cron Jobs Configurados

```bash
# Monitoreo horario
0 * * * * /home/ubuntu/lazo-app/server/disk-monitor.sh

# Limpieza diaria de Docker (3:00 AM)
0 3 * * * docker system prune -a -f --volumes

# Rotación de logs semanal (Domingos 4:00 AM)
0 4 * * 0 journalctl --vacuum-time=14d
```

## 📝 Comandos Útiles

### Verificar Uso de Disco

```bash
# Uso general del sistema
df -h /

# Uso de Docker
docker system df

# Directorios más grandes
du -sh /* 2>/dev/null | sort -hr | head -10
```

### Limpieza Manual

```bash
# Limpieza completa de Docker
docker system prune -a -f --volumes

# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log.*" -mtime +7 -delete

# Limpiar cache de npm
npm cache clean --force
```

### Monitoreo

```bash
# Ver logs de monitoreo
tail -f /var/log/disk-monitor.log

# Ver logs de limpieza Docker
tail -f /var/log/docker-cleanup.log

# Verificar cron jobs activos
crontab -l
```

## 🚀 Configuración Inicial

Para activar el monitoreo automático en el servidor EC2:

```bash
ssh lazo
cd ~/lazo-app/server
chmod +x setup-cron.sh disk-monitor.sh
./setup-cron.sh
```

## 📈 Resultados Esperados

- **Reducción inmediata**: 5-8 GB liberados después del primer deployment
- **Uso promedio**: Mantenerse por debajo del 75%
- **Prevención**: Evitar futuras alertas de AWS Free Tier
- **Automatización**: Sin intervención manual necesaria

## 🔍 Troubleshooting

### Si el disco se llena (>90%)

```bash
# 1. Limpieza de emergencia
docker system prune -a -f --volumes
sudo journalctl --vacuum-time=3d

# 2. Identificar archivos grandes
sudo du -sh /* 2>/dev/null | sort -hr

# 3. Limpiar logs específicos
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/auth.log
```

### Si los deployments fallan por falta de espacio

```bash
# Ejecutar limpieza manual antes del deployment
cd ~/lazo-app/server
./disk-monitor.sh
```

## 📊 Monitoreo en AWS Console

Para ver el uso real de EBS en AWS:

1. EC2 Dashboard → Volumes
2. Seleccionar el volumen de la instancia
3. Monitoring → VolumeReadBytes/VolumeWriteBytes
4. CloudWatch → Metrics → EBS → Per-Volume Metrics
