import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';

interface Props {
  userId: string;
  onBack: () => void;
  onSignOut: () => void;
}

const SafetyScreen: React.FC<Props> = ({ userId, onBack, onSignOut }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      if (auth.currentUser) await deleteUser(auth.currentUser);
      onSignOut();
    } catch (err) {
      alert('Reconnecte-toi et réessaie.');
    }
    setDeleting(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <h2 className="text-lg font-bold text-gray-800">Centre de sécurité</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800">Visibilité du profil</h3>
              <p className="text-xs text-gray-400 mt-0.5">{isVisible ? 'Profil visible' : 'Profil caché'}</p>
            </div>
            <button onClick={() => setIsVisible(!isVisible)}
              className={`w-12 h-6 rounded-full transition-all relative ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${isVisible ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <button className="w-full p-4 flex items-center gap-3 hover:bg-gray-50">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-flag text-orange-500"></i>
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-gray-800 text-sm">Signaler un profil</div>
              <div className="text-xs text-gray-400">Signale un comportement inapproprié</div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <button className="w-full p-4 flex items-center gap-3 hover:bg-gray-50">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-ban text-red-500"></i>
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-gray-800 text-sm">Bloquer un utilisateur</div>
              <div className="text-xs text-gray-400">Empêche quelqu'un de voir ton profil</div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-red-100">
              <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-trash text-red-600"></i>
              </div>
              <div className="text-left">
                <div className="font-semibold text-red-600 text-sm">Supprimer mon compte</div>
                <div className="text-xs text-red-400">Action irréversible</div>
              </div>
            </button>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-red-600">⚠️ Es-tu sûr(e) ?</p>
              <p className="text-xs text-red-500">Toutes tes données seront supprimées définitivement.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
                <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyScreen;
