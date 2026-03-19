import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Send,
  Search,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Image,
  ArrowLeft,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import {
  getConversationsForUser,
  getMessagesForConversation,
  sendMessage as sendDbMessage,
  markMessagesAsRead,
  subscribeToNewMessages,
  subscribeToConversations,
  type DirectMessage,
  type ConversationWithParticipant,
} from '../../lib/messages'

interface LocalMessage extends DirectMessage {
  isOptimistic?: boolean
}

interface ChatMessageProps {
  message: LocalMessage
  isSent: boolean
  formatTime: (date: Date) => string
  textPrimary: string
  textSecondary: string
  messageBgSent: string
  messageBgReceived: string
}

const ChatMessageBubble = ({
  message,
  isSent,
  formatTime,
  textPrimary,
  textSecondary,
  messageBgSent,
  messageBgReceived,
}: ChatMessageProps) => {
  return (
    <div className={clsx('flex', isSent ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[75%] px-3.5 py-2 rounded-2xl shadow-md',
          isSent ? messageBgSent : messageBgReceived,
          isSent ? 'text-white rounded-br-md' : `${textPrimary} rounded-bl-md`,
          message.isOptimistic && 'opacity-70',
          'transition-all'
        )}
      >
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
        <span className={clsx(
          'text-[10px] mt-0.5 block',
          isSent ? 'text-sky-100' : textSecondary
        )}>
          {formatTime(new Date(message.created_at))}
        </span>
      </div>
    </div>
  )
}

const MessagesPage = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipant | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileView, setIsMobileView] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const convUnsubscribeRef = useRef<(() => void) | null>(null)

  const isDark = theme === 'dark'
  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50'
  const bgSecondary = isDark ? 'bg-slate-900' : 'bg-white'
  const bgTertiary = isDark ? 'bg-slate-800/50' : 'bg-slate-100'
  const bgHover = isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-200'
  const textPrimary = isDark ? 'text-slate-50' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200'
  const messageBgSent = 'bg-gradient-to-r from-sky-500 to-blue-600'
  const messageBgReceived = isDark ? 'bg-slate-800' : 'bg-slate-200'

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const checkMobile = () => setIsMobileView(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    loadConversations()

    // Subscribe to new conversations
    void (async () => {
      const unsub = await subscribeToConversations(user.id, () => {
        loadConversations()
      })
      convUnsubscribeRef.current = unsub
    })()

    return () => {
      window.removeEventListener('resize', checkMobile)
      unsubscribeRef.current?.()
      convUnsubscribeRef.current?.()
    }
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      markMessagesAsRead(selectedConversation.id, selectedConversation.participant.id)

      // Subscribe to new messages in this conversation
      void (async () => {
        const unsub = await subscribeToNewMessages(selectedConversation.id, (newMsg) => {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, { ...newMsg, isOptimistic: false }]
          })
          // Update conversation last message
          setConversations(prev => prev.map(conv =>
            conv.id === selectedConversation.id
              ? { ...conv, last_message: newMsg, unread_count: newMsg.sender_id !== user?.id ? conv.unread_count + 1 : conv.unread_count }
              : conv
          ))
        })
        unsubscribeRef.current = unsub
      })()
    }

    return () => {
      unsubscribeRef.current?.()
    }
  }, [selectedConversation?.id])

  const loadConversations = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const convs = await getConversationsForUser(user.id)
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await getMessagesForConversation(conversationId)
      setMessages(msgs.map(m => ({ ...m, isOptimistic: false })))
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    const optimisticMessage: LocalMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
      is_read: false,
      isOptimistic: true,
    }

    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      const sentMessage = await sendDbMessage(selectedConversation.id, user.id, newMessage)
      setMessages(prev => prev.map(m =>
        m.id === optimisticMessage.id ? { ...sentMessage, isOptimistic: false } : m
      ))

      // Update conversation
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? { ...conv, last_message: sentMessage, updated_at: new Date().toISOString() }
          : conv
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.participant.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return formatTime(date)
    if (days === 1) return 'Ayer'
    if (days < 7) return date.toLocaleDateString('es-ES', { weekday: 'short' })
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSelectConversation = (conv: ConversationWithParticipant) => {
    setSelectedConversation(conv)
    if (conv.unread_count > 0 && user) {
      markMessagesAsRead(conv.id, user.id)
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, unread_count: 0 } : c
      ))
    }
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    setMessages([])
  }

  // Mobile view
  if (isMobileView) {
    if (!selectedConversation) {
      return (
        <div className={clsx('h-screen flex flex-col', bgMain)}>
          {/* Header */}
          <div className={clsx('px-4 py-3 border-b flex items-center justify-between', borderColor, bgSecondary)}>
            <h1 className={clsx('text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent')}>
              Mensajes
            </h1>
            <button
              onClick={() => setIsSearching(!isSearching)}
              className={clsx('p-2 rounded-full transition-colors', bgHover)}
            >
              <Search className={clsx('w-5 h-5', textSecondary)} />
            </button>
          </div>

          {isSearching && (
            <div className={clsx('px-4 py-2 border-b', borderColor, bgSecondary)}>
              <div className="flex items-center gap-2">
                <div className={clsx('relative flex-1 rounded-full', bgTertiary)}>
                  <Search className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', textSecondary)} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={clsx(
                      'w-full pl-9 pr-8 py-2 rounded-full outline-none text-sm',
                      bgTertiary, textPrimary
                    )}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setIsSearching(false) }}
                      className={clsx('absolute right-2 top-1/2 -translate-y-1/2', textSecondary)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className={clsx('flex items-center justify-center h-full', textSecondary)}>
                Cargando...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className={clsx('flex flex-col items-center justify-center h-full p-8', textSecondary)}>
                <p className="text-sm text-center">
                  {searchQuery ? 'No se encontraron conversaciones' : 'Aún no tienes conversaciones'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={clsx(
                    'w-full p-3 flex items-center gap-3 transition-colors border-b',
                    borderColor, bgHover
                  )}
                >
                  <div className="relative shrink-0">
                    {conv.participant.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conv.participant.avatar_url}
                        alt={conv.participant.display_name || conv.participant.username}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className={clsx(
                        'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold',
                        'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
                      )}>
                        {getInitials(conv.participant.display_name || conv.participant.username)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={clsx('font-semibold text-sm truncate', textPrimary)}>
                        {conv.participant.display_name || conv.participant.username}
                      </span>
                      {conv.last_message && (
                        <span className={clsx('text-xs', textSecondary)}>
                          {formatRelativeTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-sm truncate', textSecondary)}>
                        {conv.last_message?.content || 'Sin mensajes'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold flex items-center justify-center shadow-lg shadow-sky-500/30">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )
    }

    // Mobile chat view
    return (
      <div className={clsx('h-screen flex flex-col', bgMain)}>
        {/* Header */}
        <div className={clsx('px-3 py-2.5 border-b flex items-center gap-3', borderColor, bgSecondary)}>
          <button onClick={handleBackToList} className={clsx('p-1.5 rounded-full', bgHover)}>
            <ArrowLeft className={clsx('w-5 h-5', textSecondary)} />
          </button>

          <div className="relative">
            {selectedConversation.participant.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedConversation.participant.avatar_url}
                alt={selectedConversation.participant.display_name || selectedConversation.participant.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
              )}>
                {getInitials(selectedConversation.participant.display_name || selectedConversation.participant.username)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className={clsx('font-semibold text-sm truncate', textPrimary)}>
              {selectedConversation.participant.display_name || selectedConversation.participant.username}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
              <Phone className="w-4 h-4" />
            </button>
            <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
              <Video className="w-4 h-4" />
            </button>
            <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={clsx('flex-1 overflow-y-auto p-3 space-y-2', bgMain)}>
          {messages.map(msg => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isSent={msg.sender_id === user?.id}
              formatTime={formatTime}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              messageBgSent={messageBgSent}
              messageBgReceived={messageBgReceived}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={clsx('px-3 py-2 border-t', borderColor, bgSecondary)}>
          <div className="flex items-center gap-2">
            <button className={clsx('p-2 rounded-full', textSecondary, bgHover)}>
              <Paperclip className="w-5 h-5" />
            </button>

            <div className={clsx('flex-1 relative rounded-full', bgTertiary)}>
              <input
                type="text"
                placeholder="Mensaje..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className={clsx(
                  'w-full px-4 py-2 pr-8 rounded-full outline-none text-sm',
                  bgTertiary, textPrimary
                )}
              />
              <button className={clsx('absolute right-1.5 top-1/2 -translate-y-1/2', textSecondary)}>
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={clsx(
                'p-2 rounded-full transition-all',
                newMessage.trim()
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg'
                  : `${bgTertiary} ${textSecondary} cursor-not-allowed`
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Desktop view
  return (
    <div className={clsx('h-screen flex', bgMain)}>
      {/* Sidebar */}
      <div className={clsx('w-80 flex flex-col border-r', borderColor, bgSecondary)}>
        {/* Header */}
        <div className={clsx('px-4 py-3 border-b', borderColor)}>
          <h1 className={clsx('text-lg font-bold mb-3', textPrimary)}>
            Mensajes
          </h1>

          <div className={clsx('relative rounded-full', bgTertiary)}>
            <Search className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', textSecondary)} />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={clsx(
                'w-full pl-9 pr-4 py-2 rounded-full outline-none text-sm',
                bgTertiary, textPrimary
              )}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className={clsx('flex items-center justify-center h-full', textSecondary)}>
              Cargando...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className={clsx('flex flex-col items-center justify-center h-full p-6', textSecondary)}>
              <p className="text-sm text-center">
                {searchQuery ? 'No se encontraron conversaciones' : 'Aún no tienes conversaciones'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={clsx(
                  'w-full p-3 flex items-center gap-3 transition-colors border-b cursor-pointer',
                  borderColor, bgHover,
                  selectedConversation?.id === conv.id && (isDark ? 'bg-slate-800/80' : 'bg-slate-100')
                )}
              >
                <div className="relative shrink-0">
                  {conv.participant.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.participant.avatar_url}
                      alt={conv.participant.display_name || conv.participant.username}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className={clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold',
                      'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
                    )}>
                      {getInitials(conv.participant.display_name || conv.participant.username)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={clsx('font-semibold text-sm truncate', textPrimary)}>
                      {conv.participant.display_name || conv.participant.username}
                    </span>
                    {conv.last_message && (
                      <span className={clsx('text-xs', textSecondary)}>
                        {formatRelativeTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={clsx('text-sm truncate', textSecondary)}>
                      {conv.last_message?.content || 'Sin mensajes'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold flex items-center justify-center shadow-lg shadow-sky-500/30">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className={clsx('flex-1 flex flex-col', bgMain)}>
          {/* Header */}
          <div className={clsx('px-4 py-2.5 border-b flex items-center gap-3', borderColor, bgSecondary)}>
            <div className="relative">
              {selectedConversation.participant.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedConversation.participant.avatar_url}
                  alt={selectedConversation.participant.display_name || selectedConversation.participant.username}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
                  'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
                )}>
                  {getInitials(selectedConversation.participant.display_name || selectedConversation.participant.username)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className={clsx('font-semibold text-sm', textPrimary)}>
                {selectedConversation.participant.display_name || selectedConversation.participant.username}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
                <Phone className="w-5 h-5" />
              </button>
              <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
                <Video className="w-5 h-5" />
              </button>
              <button className={clsx('p-2 rounded-full', bgHover, textSecondary)}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={clsx('flex-1 overflow-y-auto p-4 space-y-2', bgMain)}>
            {messages.map(msg => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isSent={msg.sender_id === user?.id}
                formatTime={formatTime}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                messageBgSent={messageBgSent}
                messageBgReceived={messageBgReceived}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={clsx('px-4 py-3 border-t', borderColor, bgSecondary)}>
            <div className="flex items-center gap-2">
              <button className={clsx('p-2 rounded-full', textSecondary, bgHover)}>
                <Paperclip className="w-5 h-5" />
              </button>
              <button className={clsx('p-2 rounded-full', textSecondary, bgHover)}>
                <Image className="w-5 h-5" />
              </button>

              <div className={clsx('flex-1 relative rounded-full', bgTertiary)}>
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={clsx(
                    'w-full px-4 py-2.5 pr-10 rounded-full outline-none text-sm',
                    bgTertiary, textPrimary
                  )}
                />
                <button className={clsx('absolute right-2 top-1/2 -translate-y-1/2', textSecondary)}>
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={clsx(
                  'p-2.5 rounded-full transition-all',
                  newMessage.trim()
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-sky-500/40 hover:scale-105'
                    : `${bgTertiary} ${textSecondary} cursor-not-allowed`
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} bgMain={bgMain} />
      )}
    </div>
  )
}

// Empty State
const EmptyState = ({ isDark, textPrimary, textSecondary, bgMain }: { isDark: boolean; textPrimary: string; textSecondary: string; bgMain: string }) => {
  return (
    <div className={clsx('flex-1 flex flex-col items-center justify-center p-8', bgMain)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-blue-600/20 rounded-full blur-xl animate-pulse" />
        <div className={clsx(
          'relative w-20 h-20 rounded-full flex items-center justify-center',
          'bg-gradient-to-tr from-sky-500/10 to-blue-600/10 border',
          isDark ? 'border-sky-500/30' : 'border-sky-500/20'
        )}>
          <Send className={clsx('w-10 h-10', isDark ? 'text-sky-400' : 'text-sky-600')} />
        </div>
      </div>

      <h2 className={clsx('text-lg font-bold mb-1 text-center', textPrimary)}>
        Selecciona una conversación
      </h2>
      <p className={clsx('text-sm text-center max-w-xs', textSecondary)}>
        Elige un chat para comenzar a conversar
      </p>
    </div>
  )
}

export default MessagesPage
