import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage, cloudinaryUrl } from '../services/cloudinaryService';
import { moderateImage, verifyIdentitySelfie } from '../services/geminiService';
import { UserProfile, ChatSession, ProfileDetails } from '../types';
import { RELATIONSHIP_GOALS, RELIGIONS, LANGUAGES, SMOKING, DRINKING, CHILDREN, EDUCATION, ALL_INTERESTS, relationshipGoalLabel } from '../services/profileDetails';
import DiscoverySettingsScreen from './DiscoverySettingsScreen';
import SafetyScreen from './SafetyScreen';
import AIAssistantScreen from './AIAssistantScreen';
import SelfieCaptureScreen from './SelfieCaptureScreen';

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onSignOut: () => void;
  matches: ChatSession[];
  lang: 'fr' | 'en';
}

const PROMPT_QUESTIONS = [
  "Mon rêve le plus fou",
  "Un fait inutile que j'adore sur moi",
  "Je cherche quelqu'un qui...",
  "Ma plus grande fierté",
  "Le meilleur conseil qu'on m'ait donné",
  "Un talent caché",
];

type DetailField = {
  key: keyof ProfileDetails;
  label: string;
  icon: string;
  kind: 'choice' | 'multi' | 'text' | 'number';
  options?: string[];
};

// Rubriques "Je cherche / Essentiels / Mode de vie" façon Tinder.
const DETAIL_FIELDS: DetailField[] = [
  { key: 'relationshipGoal', label: 'Je cherche', icon: 'fa-heart', kind: 'choice', options: RELATIONSHIP_GOALS.map(g => g.value) },
  { key: 'height', label: 'Taille (cm)', icon: 'fa-ruler-vertical', kind: 'number' },
  { key: 'job', label: 'Métier', icon: 'fa-briefcase', kind: 'text' },
  { key: 'education', label: 'Études', icon: 'fa-graduation-cap', kind: 'choice', options: EDUCATION },
  { key: 'religion', label: 'Religion', icon: 'fa-hands-praying', kind: 'choice', options: RELIGIONS },
  { key: 'languages', label: 'Langues parlées', icon: 'fa-language', kind: 'multi', options: LANGUAGES },
  { key: 'children', label: 'Enfants', icon: 'fa-baby', kind: 'choice', options: CHILDREN },
  { key: 'smoking', label: 'Tabac', icon: 'fa-smoking', kind: 'choice', options: SMOKING },
  { key: 'drinking', label: 'Alcool', icon: 'fa-wine-glass', kind: 'choice', options: DRINKING },
];

const ProfileScreen: React.FC<Props> = ({ user, setUser, onSignOut, matches, lang }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSelfieCam, setShowSelfieCam] = useState(false);
  const [subScreen, setSubScreen] = useState<'main' | 'discovery' | 'safety' | 'ai'>('main');
  const [activePhoto, setActivePhoto] = useState(0);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<{ index: number; question: string; answer: string } | null>(null);
  const [editingDetail, setEditingDetail] = useState<DetailField | null>(null);
  const [detailDraft, setDetailDraft] = useState<string>('');
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [editingInterests, setEditingInterests] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState<string[]>([]);

  if (subScreen === 'discovery') return <DiscoverySettingsScreen user={user} setUser={setUser} onBack={() => setSubScreen('main')} />;
  if (subScreen === 'safety') return <SafetyScreen userId={user.id} onBack={() => setSubScreen('main')} onSignOut={onSignOut} />;
  if (subScreen === 'ai') return (
    <AIAssistantScreen
      userId={user.id}
      matches={matches}
      lang={lang}
      aiConsent={user.aiConsent}
      onConsentChange={(value) => {
        updateDoc(doc(db, 'users', user.id), { aiConsent: value }).catch(() => {});
        setUser(prev => prev ? { ...prev, aiConsent: value } : prev);
      }}
      onBack={() => setSubScreen('main')}
    />
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (user.images.length + files.length > 6) { alert('Maximum 6 photos !'); return; }
    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      let rejected = 0;
      for (const file of files) {
        if (!(await moderateImage(file))) { rejected++; continue; }
        const url = await uploadImage(file, user.id);
        newUrls.push(url);
      }
      if (newUrls.length) {
        const updatedImages = [...user.images, ...newUrls];
        await updateDoc(doc(db, 'users', user.id), { images: updatedImages, photoURL: updatedImages[0] || '' });
        setUser(prev => prev ? { ...prev, images: updatedImages } : null);
      }
      if (rejected > 0) alert(`${rejected} photo(s) refusée(s) : contenu non conforme à nos règles.`);
    } catch { alert('Erreur upload.'); }
    setIsUploading(false);
  };

  const handleRemovePhoto = async (index: number) => {
    const updatedImages = user.images.filter((_, i) => i !== index);
    await updateDoc(doc(db, 'users', user.id), { images: updatedImages, photoURL: updatedImages[0] || '' });
    setUser(prev => prev ? { ...prev, images: updatedImages } : null);
    setActivePhoto(0);
  };

  const handleBioChange = async (bio: string) => {
    setUser(prev => prev ? { ...prev, bio } : null);
    try { await updateDoc(doc(db, 'users', user.id), { bio }); } catch {}
  };

  const handleTogglePremium = async () => {
    const isPremium = !user.isPremium;
    setUser(prev => prev ? { ...prev, isPremium } : null);
    try { await updateDoc(doc(db, 'users', user.id), { isPremium }); } catch {}
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt || !editingPrompt.answer.trim()) return;
    const prompts = [...(user.prompts || [])];
    const entry = { question: editingPrompt.question, answer: editingPrompt.answer.trim() };
    if (editingPrompt.index === -1) prompts.push(entry);
    else prompts[editingPrompt.index] = entry;
    setUser(prev => prev ? { ...prev, prompts } : null);
    setEditingPrompt(null);
    try { await updateDoc(doc(db, 'users', user.id), { prompts }); } catch {}
  };

  const handleRemovePrompt = async (index: number) => {
    const prompts = (user.prompts || []).filter((_, i) => i !== index);
    setUser(prev => prev ? { ...prev, prompts } : null);
    try { await updateDoc(doc(db, 'users', user.id), { prompts }); } catch {}
  };

  const saveDetails = async (details: ProfileDetails) => {
    setUser(prev => prev ? { ...prev, details } : null);
    try { await updateDoc(doc(db, 'users', user.id), { details }); } catch {}
  };

  const openDetail = (field: DetailField) => {
    const current = user.details?.[field.key];
    if (field.kind === 'multi') setMultiDraft(Array.isArray(current) ? current : []);
    else setDetailDraft(current !== undefined ? String(current) : '');
    setEditingDetail(field);
  };

  const commitDetail = (value: string | number | string[] | undefined) => {
    if (!editingDetail) return;
    const details: ProfileDetails = { ...(user.details || {}) };
    const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) delete details[editingDetail.key];
    else (details as any)[editingDetail.key] = value;
    setEditingDetail(null);
    saveDetails(details);
  };

  const detailValueLabel = (field: DetailField): string => {
    const v = user.details?.[field.key];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return '';
    if (field.key === 'relationshipGoal') return relationshipGoalLabel(String(v));
    if (field.key === 'height') return `${v} cm`;
    return Array.isArray(v) ? v.join(', ') : String(v);
  };

  const handleSaveInterests = async () => {
    if (interestsDraft.length < 3) { alert('Choisis au moins 3 passions.'); return; }
    setUser(prev => prev ? { ...prev, interests: interestsDraft } : null);
    setEditingInterests(false);
    try { await updateDoc(doc(db, 'users', user.id), { interests: interestsDraft }); } catch {}
  };

  // Mode pause (le "Snooze" de Tinder) : le profil disparaît de la découverte,
  // mais les matchs et conversations existants continuent de fonctionner.
  const handleTogglePause = async () => {
    const hidden = !user.hidden;
    setUser(prev => prev ? { ...prev, hidden } : null);
    try { await updateDoc(doc(db, 'users', user.id), { hidden }); } catch {}
  };

  const handleSelfieCapture = async (blob: Blob) => {
    setShowSelfieCam(false);
    if (!user.images[0]) return;
    setIsVerifying(true);
    try {
      const result = await verifyIdentitySelfie(blob, cloudinaryUrl(user.images[0], 500, 500));
      if (result === 'match') {
        await updateDoc(doc(db, 'users', user.id), { identityVerified: true });
        setUser(prev => prev ? { ...prev, identityVerified: true } : null);
      } else if (result === 'no_match') {
        alert("On n'a pas réussi à confirmer qu'il s'agit bien de toi. Réessaie avec un selfie net, en pleine lumière, visage dégagé.");
      } else {
        alert("Erreur technique pendant la vérification (réseau ou service indisponible). Réessaie dans quelques instants.");
      }
    } catch { alert('Erreur lors de la vérification.'); }
    setIsVerifying(false);
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Urukundo', text: "Rejoins Urukundo 🇧🇮", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié !");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="relative h-[45vh] min-h-72 w-full">
        {user.images[activePhoto] ? (
          <img src={cloudinaryUrl(user.images[activePhoto], 900, 650)} className="w-full h-full object-cover" alt="Profil" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
            <i className="fa-solid fa-user text-gray-300 text-6xl"></i>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Indicateurs photos */}
        {user.images.length > 1 && (
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1">
            {user.images.map((_, i) => (
              <button key={i} onClick={() => setActivePhoto(i)}
                className={`h-1 rounded-full transition-all ${i === activePhoto ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        )}

        {/* Flèches navigation */}
        {user.images.length > 1 && (
          <>
            <button onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white">
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button onClick={() => setActivePhoto(p => Math.min(user.images.length - 1, p + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white">
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </>
        )}

        {/* Boutons photo */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {user.images.length > 1 && (
            <button onClick={() => handleRemovePhoto(activePhoto)}
              className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white">
              <i className="fa-solid fa-trash text-sm"></i>
            </button>
          )}
          {user.images.length < 6 && (
            <label className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-red-500 cursor-pointer">
              {isUploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex justify-between items-end">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-1.5">
            {user.name}, {user.age}
            {user.identityVerified && <i className="fa-solid fa-circle-check text-blue-500 text-base" title="Identité vérifiée"></i>}
          </h3>
          <span className="text-sm text-gray-500 px-3 py-1 bg-gray-50 rounded-full border border-gray-100 flex items-center gap-1">
            📍 {user.location}
            {user.locationVerified && <i className="fa-solid fa-circle-check text-green-500 text-xs" title="Position vérifiée"></i>}
          </span>
        </div>

        <div className="text-xs text-gray-400 font-medium">
          {user.images.length}/6 photos · {user.images.length < 6 ? 'Ajoute plus de photos !' : 'Maximum atteint'}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">À propos de moi</label>
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:ring-1 focus:ring-red-200 min-h-[100px]"
            value={user.bio} onChange={(e) => handleBioChange(e.target.value)} placeholder="Dis-nous en plus..." />
        </div>

        <button onClick={handleShareApp}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
          <i className="fa-solid fa-share-nodes"></i> INVITER DES AMIS
        </button>

        {user.hidden && (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-sm text-yellow-700 flex items-start gap-3">
            <i className="fa-solid fa-pause mt-0.5"></i>
            <span>Ton profil est en pause : personne de nouveau ne peut te voir. Tes matchs et messages continuent de marcher.</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Mes infos</label>
          <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
            {DETAIL_FIELDS.map(field => {
              const value = detailValueLabel(field);
              return (
                <button key={field.key} onClick={() => openDetail(field)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 text-left">
                  <i className={`fa-solid ${field.icon} text-gray-400 w-4 text-center`}></i>
                  <span className="text-sm text-gray-700 flex-1">{field.label}</span>
                  <span className={`text-xs truncate max-w-[50%] ${value ? 'text-gray-500' : 'text-red-400 font-medium'}`}>{value || 'Ajouter'}</span>
                  <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Centres d'intérêt</label>
            <button onClick={() => { setInterestsDraft(user.interests || []); setEditingInterests(true); }}
              className="text-xs text-red-500 font-medium flex items-center gap-1">
              <i className="fa-solid fa-pen text-[10px]"></i> Modifier
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.interests || []).map(i => (
              <span key={i} className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-100">{i}</span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Mes prompts</label>
          <div className="space-y-2">
            {(user.prompts || []).map((p, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-2xl relative pr-20">
                <p className="text-xs text-red-500 font-bold uppercase mb-1">{p.question}</p>
                <p className="text-sm text-gray-700">{p.answer}</p>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => setEditingPrompt({ index: i, question: p.question, answer: p.answer })}
                    className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-400">
                    <i className="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button onClick={() => handleRemovePrompt(i)}
                    className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-red-400">
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
            {(user.prompts || []).length < 3 && (
              <button onClick={() => setShowPromptPicker(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 font-medium">
                + Ajouter un prompt
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100 pb-8">
          {user.identityVerified ? (
            <div className="w-full p-4 flex items-center gap-3 text-blue-500">
              <i className="fa-solid fa-circle-check"></i>
              <span className="text-sm font-medium">Identité vérifiée</span>
            </div>
          ) : (
            <button type="button" disabled={isVerifying || !user.images[0]} onClick={() => setShowSelfieCam(true)}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-100 disabled:cursor-default">
              <div className="flex items-center gap-3">
                <i className={`fa-solid ${isVerifying ? 'fa-spinner fa-spin' : 'fa-id-badge'} text-blue-500`}></i>
                <span className="text-sm text-gray-700">
                  {isVerifying ? 'Vérification en cours...' : 'Vérifier mon profil (badge)'}
                </span>
              </div>
              {!isVerifying && !user.images[0] && <span className="text-[10px] text-gray-400">Ajoute une photo d'abord</span>}
            </button>
          )}
          {showSelfieCam && (
            <SelfieCaptureScreen lang={lang} onCapture={handleSelfieCapture} onCancel={() => setShowSelfieCam(false)} />
          )}
          <button onClick={handleTogglePremium}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-star text-yellow-500"></i>
              <span className="text-sm text-gray-700">⭐ Compte Premium (test)</span>
            </div>
            <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${user.isPremium ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-5 h-5 bg-white rounded-full shadow"></div>
            </div>
          </button>
          <button onClick={handleTogglePause}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-pause text-yellow-500"></i>
              <div className="text-left">
                <span className="text-sm text-gray-700 block">Mettre mon profil en pause</span>
                <span className="text-[10px] text-gray-400">Invisible dans la découverte, tes matchs restent</span>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${user.hidden ? 'bg-yellow-500 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-5 h-5 bg-white rounded-full shadow"></div>
            </div>
          </button>
          <button onClick={() => setSubScreen('ai')}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-robot text-indigo-500"></i>
              <span className="text-sm text-gray-700">Assistant IA</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
          <button onClick={() => setSubScreen('discovery')}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-sliders text-red-500"></i>
              <span className="text-sm text-gray-700">Paramètres de découverte</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
          <button onClick={() => setSubScreen('safety')}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield text-green-500"></i>
              <span className="text-sm text-gray-700">Centre de sécurité</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
          <button onClick={onSignOut}
            className="w-full p-4 flex items-center gap-3 text-red-500 font-medium hover:bg-red-50">
            <i className="fa-solid fa-right-from-bracket"></i> Se déconnecter
          </button>
        </div>
      </div>

      {showPromptPicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowPromptPicker(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-2 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Choisis une question</h3>
            {PROMPT_QUESTIONS.filter(q => !(user.prompts || []).some(p => p.question === q)).map(q => (
              <button key={q} onClick={() => { setEditingPrompt({ index: -1, question: q, answer: '' }); setShowPromptPicker(false); }}
                className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left text-sm text-gray-700">
                {q}
              </button>
            ))}
            <button onClick={() => setShowPromptPicker(false)} className="w-full py-2 text-sm text-gray-400">Annuler</button>
          </div>
        </div>
      )}

      {editingDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setEditingDetail(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-2 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <i className={`fa-solid ${editingDetail.icon} text-red-400`}></i> {editingDetail.label}
            </h3>
            {editingDetail.kind === 'choice' && editingDetail.options!.map(opt => {
              const selected = String(user.details?.[editingDetail.key] ?? '') === opt;
              return (
                <button key={opt} onClick={() => commitDetail(selected ? undefined : opt)}
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm ${selected ? 'bg-red-500 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                  {editingDetail.key === 'relationshipGoal' ? relationshipGoalLabel(opt) : opt}
                </button>
              );
            })}
            {editingDetail.kind === 'multi' && (
              <>
                <div className="flex flex-wrap gap-2">
                  {editingDetail.options!.map(opt => {
                    const selected = multiDraft.includes(opt);
                    return (
                      <button key={opt} onClick={() => setMultiDraft(prev => selected ? prev.filter(o => o !== opt) : [...prev, opt])}
                        className={`px-4 py-2 rounded-full text-sm border ${selected ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200'}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => commitDetail(multiDraft)} className="w-full mt-3 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm">Enregistrer</button>
              </>
            )}
            {(editingDetail.kind === 'text' || editingDetail.kind === 'number') && (
              <>
                <input autoFocus value={detailDraft} onChange={e => setDetailDraft(e.target.value)}
                  type={editingDetail.kind === 'number' ? 'number' : 'text'}
                  inputMode={editingDetail.kind === 'number' ? 'numeric' : undefined}
                  min={editingDetail.kind === 'number' ? 120 : undefined} max={editingDetail.kind === 'number' ? 230 : undefined}
                  maxLength={60}
                  placeholder={editingDetail.kind === 'number' ? 'Ex : 175' : 'Ex : Infirmière, Étudiant, Entrepreneur...'}
                  className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                <button
                  onClick={() => {
                    if (editingDetail.kind === 'number') {
                      const n = parseInt(detailDraft, 10);
                      if (detailDraft && (isNaN(n) || n < 120 || n > 230)) { alert('Indique une taille entre 120 et 230 cm.'); return; }
                      commitDetail(detailDraft ? n : undefined);
                    } else commitDetail(detailDraft.trim());
                  }}
                  className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold text-sm">Enregistrer</button>
              </>
            )}
            <button onClick={() => setEditingDetail(null)} className="w-full py-2 text-sm text-gray-400">Annuler</button>
          </div>
        </div>
      )}

      {editingInterests && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setEditingInterests(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">Mes passions</h3>
            <p className="text-xs text-gray-400">{interestsDraft.length}/5 · choisis-en entre 3 et 5</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(i => {
                const selected = interestsDraft.includes(i);
                const full = !selected && interestsDraft.length >= 5;
                return (
                  <button key={i} disabled={full}
                    onClick={() => setInterestsDraft(prev => selected ? prev.filter(x => x !== i) : [...prev, i])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selected ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200'} ${full ? 'opacity-40' : ''}`}>
                    {i}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingInterests(false)} className="flex-1 py-3 text-sm text-gray-400 font-medium">Annuler</button>
              <button onClick={handleSaveInterests} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {editingPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setEditingPrompt(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-xs text-red-500 font-bold uppercase">{editingPrompt.question}</p>
            <textarea autoFocus className="w-full p-4 bg-gray-50 rounded-2xl text-sm min-h-[100px]" value={editingPrompt.answer}
              onChange={e => setEditingPrompt(prev => prev ? { ...prev, answer: e.target.value } : prev)}
              placeholder="Ta réponse..." maxLength={150} />
            <div className="flex gap-2">
              <button onClick={() => setEditingPrompt(null)} className="flex-1 py-3 text-sm text-gray-400 font-medium">Annuler</button>
              <button onClick={handleSavePrompt} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
