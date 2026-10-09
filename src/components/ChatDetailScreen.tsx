import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatSession, UserProfile } from '../types';
import { getConversationStarter } from '../services/geminiService';
import { notifyUser } from '../services/pushService';
import { calculateDistance } from '../services/locationService';
import { cloudinaryUrl } from '../services/cloudinaryService';
import LiveLocationMap from './LiveLocationMap';

interface Props {
  session: ChatSession;
  currentUserId: string;
  onBack: () => void;
  lang?: 'fr' | 'en';
  onReport?: (profile: UserProfile, reason: string) => void;
  onBlock?: (profile: UserProfile) => void;
}

const REPORT_REASONS_FR = ['Faux profil', 'Contenu inapproprié', 'Harcèlement', 'Autre'];
const REPORT_REASONS_EN = ['Fake profile', 'Inappropriate content', 'Harassment', 'Other'];

const ChatDetailScreen: React.FC<Props> = ({ session, currentUserId, onBack, lang = 'fr', onReport, onBlock }) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const chatId = [currentUserId, session.partner.id].sort().join('_');

  const T = {
    fr: { matched: 'Vous avez matché 🎉 Amahoro !', placeholder: 'Écris un message...', wingman: 'AI WINGMAN : SUGGÈRE UNE RÉPONSE', thinking: 'Réflexion...', whatsappPrompt: 'Entre ton numéro WhatsApp :', call: 'Appeler', report: 'Signaler', block: 'Bloquer', cancel: 'Annuler', reportTitle: 'Pourquoi signaler ce profil ?', blockTitle: 'Bloquer ce profil ?', blockBody: "Cette personne ne pourra plus voir ton profil, ni toi le sien.", blockConfirm: 'Bloquer',
      shareLocation: 'Partager ma position en direct', stopSharing: 'Arrêter le partage de position',
      waitingPartner: (name: string) => `En attente que ${name} active aussi le partage 📍`,
      locationDenied: 'Position refusée. Active la localisation pour partager.' },
    en: { matched: 'You matched 🎉 Amahoro!', placeholder: 'Type a message...', wingman: 'AI WINGMAN: SUGGEST A REPLY', thinking: 'Thinking...', whatsappPrompt: 'Enter your WhatsApp number:', call: 'Call', report: 'Report', block: 'Block', cancel: 'Cancel', reportTitle: 'Why are you reporting this profile?', blockTitle: 'Block this profile?', blockBody: "This person won't be able to see your profile, or you theirs.", blockConfirm: 'Block',
      shareLocation: 'Share my live location', stopSharing: 'Stop sharing location',
      waitingPartner: (name: string) => `Waiting for ${name} to also enable sharing 📍`,
      locationDenied: 'Location denied. Enable it to share.' }
  };
  const t = T[lang];
  const reportReasons = lang === 'fr' ? REPORT_REASONS_FR : REPORT_REASONS_EN;

  const myLiveLocationOn = !!matchData?.liveLocation?.[currentUserId];
  const partnerLiveLocationOn = !!matchData?.liveLocation?.[session.partner.id];
  const myCoords = matchData?.liveCoords?.[currentUserId];
  const partnerCoords = matchData?.liveCoords?.[session.partner.id];

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toMillis() || Date.now() })));
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'matches', chatId), (snap) => setMatchData(snap.data() || null), () => {});
    return () => unsub();
  }, [chatId]);

  // Suivi GPS tant que CE chat est ouvert et que le partage est activé — pas de
  // suivi en arrière-plan (limite des navigateurs, pas un choix de design).
  useEffect(() => {
    if (!myLiveLocationOn) return;
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < 15000) return; // throttle les écritures Firestore
        lastSentAtRef.current = now;
        updateDoc(doc(db, 'matches', chatId), {
          [`liveCoords.${currentUserId}`]: { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: Date.now() },
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    watchIdRef.current = id;
    return () => { navigator.geolocation.clearWatch(id); watchIdRef.current = null; };
  }, [myLiveLocationOn, chatId, currentUserId]);

  const toggleLiveLocation = async () => {
    if (myLiveLocationOn) {
      await updateDoc(doc(db, 'matches', chatId), {
        [`liveLocation.${currentUserId}`]: deleteField(),
        [`liveCoords.${currentUserId}`]: deleteField(),
      }).catch(() => {});
    } else {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          lastSentAtRef.current = Date.now();
          await updateDoc(doc(db, 'matches', chatId), {
            [`liveLocation.${currentUserId}`]: true,
            [`liveCoords.${currentUserId}`]: { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: Date.now() },
          }).catch(() => {});
        },
        () => alert(t.locationDenied),
        { enableHighAccuracy: true }
      );
    }
    setShowMenu(false);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUserId, text, timestamp: serverTimestamp(),
      });
      setDoc(doc(db, 'matches', chatId), { lastMessageText: text, lastMessageSenderId: currentUserId, lastMessageAt: serverTimestamp() }, { merge: true }).catch(() => {});
      notifyUser(session.partner.id, lang === 'fr' ? '💬 Nouveau message' : '💬 New message', text);
    } catch (err) { console.error(err); }
  };

  const handleAiWingman = async () => {
    setIsAiLoading(true);
    const suggestion = await getConversationStarter(session.partner.name, session.partner.interests, currentUserId, messages, lang);
    setInputText(suggestion);
    setIsAiLoading(false);
    inputRef.current?.focus();
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      const number = whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${number}`, '_blank');
    } else {
      setShowWhatsApp(true);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 flex-shrink-0">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500 p-1">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        {session.partner.images?.[0] ? (
          <img src={cloudinaryUrl(session.partner.images[0], 80, 80)} className="w-10 h-10 rounded-full object-cover" alt={session.partner.name} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-200 to-green-200 flex items-center justify-center">
            <span className="text-white font-bold">{session.partner.name[0]}</span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 leading-none">{session.partner.name}</h4>
          <span className="text-[10px] text-green-500 font-medium">● {lang === 'fr' ? 'En ligne' : 'Online'}</span>
        </div>
        <button onClick={handleWhatsApp}
          className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
          <i className="fa-brands fa-whatsapp text-lg"></i>
        </button>
        {(onReport || onBlock) && (
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50">
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20" style={{ minWidth: 140 }}>
                  <button onClick={toggleLiveLocation}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                    <i className={`fa-solid fa-location-dot ${myLiveLocationOn ? 'text-blue-500' : 'text-gray-400'}`}></i>
                    {myLiveLocationOn ? t.stopSharing : t.shareLocation}
                  </button>
                  {onReport && (
                    <button onClick={() => { setShowReportReasons(true); setShowMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <i className="fa-solid fa-flag text-orange-500"></i> {t.report}
                    </button>
                  )}
                  {onBlock && (
                    <button onClick={() => { setShowBlockConfirm(true); setShowMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100">
                      <i className="fa-solid fa-ban"></i> {t.block}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showReportReasons && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowReportReasons(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.reportTitle}</h3>
            <div className="space-y-2">
              {reportReasons.map(reason => (
                <button key={reason} onClick={() => { onReport?.(session.partner, reason); setShowReportReasons(false); }}
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left text-sm text-gray-700">
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setShowReportReasons(false)} className="w-full py-2 text-sm text-gray-400">{t.cancel}</button>
          </div>
        </div>
      )}

      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowBlockConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.blockTitle}</h3>
            <p className="text-sm text-gray-500">{t.blockBody}</p>
            <button onClick={() => { onBlock?.(session.partner); setShowBlockConfirm(false); }} className="mt-2 w-full py-3 bg-red-500 text-white rounded-2xl font-bold">
              {t.blockConfirm}
            </button>
            <button onClick={() => setShowBlockConfirm(false)} className="w-full py-2 text-sm text-gray-400">{t.cancel}</button>
          </div>
        </div>
      )}

      {showWhatsApp && (
        <div className="bg-green-50 p-4 border-b border-green-100 flex-shrink-0">
          <p className="text-xs text-green-700 font-medium mb-2">{t.whatsappPrompt}</p>
          <div className="flex gap-2">
            <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="+257 XX XXX XXX"
              className="flex-1 p-2 bg-white rounded-xl text-sm border border-green-200 focus:outline-none" />
            <button onClick={() => { handleWhatsApp(); setShowWhatsApp(false); }}
              className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium">{t.call}</button>
            <button onClick={() => setShowWhatsApp(false)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">✕</button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50" style={{ overscrollBehavior: 'contain' }}>
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t.matched}</p>
        </div>

        {myLiveLocationOn && !partnerLiveLocationOn && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-600 font-medium text-center">
            {t.waitingPartner(session.partner.name)}
          </div>
        )}

        {myLiveLocationOn && partnerLiveLocationOn && myCoords && partnerCoords && (
          <LiveLocationMap
            me={myCoords}
            partner={partnerCoords}
            partnerName={session.partner.name}
            distanceKm={calculateDistance(myCoords.lat, myCoords.lng, partnerCoords.lat, partnerCoords.lng)}
          />
        )}
        {messages.map(msg => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-red-500 text-white rounded-br-none' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-t border-gray-100 flex-shrink-0 p-4">
        <div className="flex flex-col gap-2">
          <button onClick={handleAiWingman} disabled={isAiLoading}
            className="self-start text-[10px] font-bold py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            {isAiLoading ? t.thinking : t.wingman}
          </button>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
              placeholder={t.placeholder} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              style={{ fontSize: '16px' }} />
            <button onClick={handleSend}
              className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailScreen;
