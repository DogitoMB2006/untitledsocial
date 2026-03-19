# Configuración de Direct Messages

## Instrucciones para habilitar los mensajes directos

### 1. Ejecutar el script SQL en Supabase

1. Ve a tu proyecto de Supabase
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `supabase-migrations.sql`
4. Ejecuta el script completo

Esto creará:
- Tabla `conversations` - para almacenar las conversaciones entre usuarios
- Tabla `conversation_participants` - para tracking de lectura de mensajes
- Tabla `direct_messages` - para almacenar los mensajes
- Todos los índices necesarios para optimizar las consultas
- Políticas de Row Level Security (RLS) para proteger los datos
- Triggers para actualizar automáticamente los timestamps
- Funciones utilitarias para obtener/crear conversaciones

### 2. Cómo funciona el sistema de mensajes

#### Requisitos para chatear
- Dos usuarios deben **seguirse mutuamente** para poder iniciar una conversación
- El sistema verifica automáticamente la relación de seguimiento antes de crear una conversación

#### Características implementadas
- ✅ Conversaciones en tiempo real con Supabase Realtime
- ✅ Estados de lectura (is_read)
- ✅ Contador de mensajes no leídos
- ✅ Actualización automática de la lista de conversaciones
- ✅ Mensajes optimistas para mejor UX
- ✅ Diseño responsive (móvil y escritorio)
- ✅ Modo oscuro/claro global
- ✅ Notificaciones de nuevos mensajes en tiempo real

### 3. Estructura de la base de datos

```
profiles (ya existe)
├── id
├── username
├── display_name
└── avatar_url

conversations
├── id (UUID)
├── participant_1_id (FK → profiles)
├── participant_2_id (FK → profiles)
├── created_at
└── updated_at

conversation_participants
├── id (UUID)
├── conversation_id (FK → conversations)
├── user_id (FK → profiles)
└── last_read_at

direct_messages
├── id (UUID)
├── conversation_id (FK → conversations)
├── sender_id (FK → profiles)
├── content
├── created_at
└── is_read
```

### 4. Uso de la página de Mensajes

- Accede a `/messages` desde el navbar lateral
- La lista muestra todas tus conversaciones activas
- Los mensajes no leídos se muestran con un badge azul
- Haz clic en una conversación para abrir el chat
- Escribe mensajes y presiona Enter para enviar

### 5. Consideraciones de seguridad

- Las políticas de RLS aseguran que solo los participantes de una conversación puedan ver los mensajes
- Los usuarios solo pueden enviar mensajes en conversaciones donde son participantes
- El sistema verifica que los usuarios se sigan mutuamente antes de permitir crear una conversación

### 6. Posibles mejoras futuras

- Soporte para enviar imágenes/archivos
- Mensajes eliminados (soft delete)
- Reacciones a mensajes
- Respuestas a mensajes específicos (threads)
- Búsqueda dentro de conversaciones
- Archivar conversaciones
- Bloquear usuarios
