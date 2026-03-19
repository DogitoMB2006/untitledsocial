-- ============================================
-- DIRECT MESSAGES SCHEMA FOR SUPABASE
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para habilitar la funcionalidad de mensajes directos

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant_2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint para evitar conversaciones duplicadas
  CONSTRAINT unique_participants UNIQUE (participant_1_id, participant_2_id),
  -- Constraint para evitar que un usuario sea ambos participantes
  CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_conversations_participants 
ON public.conversations(participant_1_id, participant_2_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON public.conversations(updated_at DESC);

-- Tabla de participantes de conversación (para tracking de lectura)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv 
ON public.conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
ON public.conversation_participants(user_id);

-- Tabla de mensajes directos
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  
  CONSTRAINT valid_message CHECK (char_length(content) > 0 AND char_length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation 
ON public.direct_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at 
ON public.direct_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_unread 
ON public.direct_messages(conversation_id, is_read) WHERE is_read = false;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies para conversations
CREATE POLICY "Users can view conversations they are part of"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

CREATE POLICY "Users can update conversations they are part of"
  ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

CREATE POLICY "Users can delete conversations they are part of"
  ON public.conversations
  FOR DELETE
  USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

-- Policies para conversation_participants
CREATE POLICY "Users can view conversation participants"
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create conversation participants"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own participant record"
  ON public.conversation_participants
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies para direct_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.direct_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages in their conversations"
  ON public.direct_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en conversations
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_updated_at
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_updated_at();

-- Trigger para crear conversation_participants automáticamente
CREATE OR REPLACE FUNCTION public.create_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar participante 1
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.participant_1_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  -- Insertar participante 2
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.participant_2_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_conversation_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_conversation_participants();

-- ============================================
-- FUNCIONES UTILITARIAS
-- ============================================

-- Función para obtener o crear conversación
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  user_id_1 UUID,
  user_id_2 UUID
)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Buscar conversación existente (ambas direcciones)
  SELECT id INTO conv_id
  FROM public.conversations
  WHERE (participant_1_id = user_id_1 AND participant_2_id = user_id_2)
     OR (participant_1_id = user_id_2 AND participant_2_id = user_id_1)
  LIMIT 1;
  
  -- Si no existe, crear nueva
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_1_id, participant_2_id)
    VALUES (user_id_1, user_id_2)
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener conversaciones de un usuario con último mensaje
CREATE OR REPLACE FUNCTION public.get_user_conversations(current_user_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  participant_1_id UUID,
  participant_2_id UUID,
  last_message JSONB,
  participant_profile JSONB,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.created_at,
    c.updated_at,
    c.participant_1_id,
    c.participant_2_id,
    (
      SELECT jsonb_build_object(
        'id', dm.id,
        'sender_id', dm.sender_id,
        'content', dm.content,
        'created_at', dm.created_at,
        'is_read', dm.is_read
      )
      FROM public.direct_messages dm
      WHERE dm.conversation_id = c.id
      ORDER BY dm.created_at DESC
      LIMIT 1
    )::JSONB AS last_message,
    (
      SELECT jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      )
      FROM public.profiles p
      WHERE p.id = CASE 
        WHEN c.participant_1_id = current_user_id THEN c.participant_2_id
        ELSE c.participant_1_id
      END
    )::JSONB AS participant_profile,
    (
      SELECT COUNT(*)
      FROM public.direct_messages dm
      WHERE dm.conversation_id = c.id
        AND dm.sender_id != current_user_id
        AND dm.is_read = false
    ) AS unread_count
  FROM public.conversations c
  WHERE c.participant_1_id = current_user_id OR c.participant_2_id = current_user_id
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ÍNDICES ADICIONALES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índice compuesto para la función de conversaciones
CREATE INDEX IF NOT EXISTS idx_conversations_user_lookup
ON public.conversations(participant_1_id)
WHERE participant_1_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user_lookup_2
ON public.conversations(participant_2_id)
WHERE participant_2_id IS NOT NULL;
