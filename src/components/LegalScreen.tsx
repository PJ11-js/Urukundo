import React, { useState } from 'react';

interface Props {
  onAccept: () => void;
}

const LegalScreen: React.FC<Props> = ({ onAccept }) => {
  const [tab, setTab] = useState<'cgu' | 'privacy'>('cgu');
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
      <div className="px-6 py-4 border-b border-gray-100 text-center">
        <div className="text-3xl mb-1">🇧🇮</div>
        <h1 className="text-xl font-black text-red-600">URUKUNDO</h1>
        <p className="text-xs text-gray-400 mt-1">Avant de continuer, lis nos conditions</p>
      </div>

      <div className="flex border-b border-gray-100">
        <button onClick={() => setTab('cgu')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${tab === 'cgu' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}>
          Conditions d'utilisation
        </button>
        <button onClick={() => setTab('privacy')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${tab === 'privacy' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}>
          Confidentialité
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-600 space-y-4">
        {tab === 'cgu' ? (
          <>
            <h2 className="font-bold text-gray-800 text-base">Conditions Générales d'Utilisation</h2>
            <p className="text-xs text-gray-400">Dernière mise à jour : Mars 2026</p>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">1. Acceptation des conditions</h3>
              <p>En utilisant Urukundo, vous acceptez ces conditions. Si vous n'acceptez pas, vous ne pouvez pas utiliser l'application.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">2. Éligibilité</h3>
              <p>Vous devez avoir au moins 18 ans pour utiliser Urukundo. En créant un compte, vous confirmez que vous avez l'âge requis.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">3. Comportement acceptable</h3>
              <p>Vous vous engagez à :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Utiliser votre vraie identité</li>
                <li>Respecter les autres utilisateurs</li>
                <li>Ne pas harceler, menacer ou intimider</li>
                <li>Ne pas publier de contenu inapproprié</li>
                <li>Ne pas créer de faux profils</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">4. Contenu interdit</h3>
              <p>Il est strictement interdit de publier du contenu :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Sexuellement explicite</li>
                <li>Haineux ou discriminatoire</li>
                <li>Frauduleux ou trompeur</li>
                <li>Illégal selon les lois burundaises ou internationales</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">5. Suspension de compte</h3>
              <p>Urukundo se réserve le droit de suspendre ou supprimer tout compte qui viole ces conditions, sans préavis.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">6. Limitation de responsabilité</h3>
              <p>Urukundo est une plateforme de rencontre. Nous ne sommes pas responsables des actions des utilisateurs en dehors de l'application.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">7. Contact</h3>
              <p>Pour toute question : urukundo.app@gmail.com</p>
            </section>
          </>
        ) : (
          <>
            <h2 className="font-bold text-gray-800 text-base">Politique de Confidentialité</h2>
            <p className="text-xs text-gray-400">Dernière mise à jour : Mars 2026</p>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">1. Données collectées</h3>
              <p>Nous collectons :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Nom, âge, photo de profil</li>
                <li>Adresse email (via Google)</li>
                <li>Localisation GPS (avec votre permission)</li>
                <li>Vos intérêts et préférences</li>
                <li>Vos messages dans l'application</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">2. Utilisation des données</h3>
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Afficher votre profil aux autres utilisateurs</li>
                <li>Calculer les distances entre utilisateurs</li>
                <li>Améliorer les suggestions de matches</li>
                <li>Sécuriser votre compte</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">3. Partage des données</h3>
              <p>Nous ne vendons jamais vos données. Vos informations ne sont partagées qu'avec les utilisateurs avec qui vous matchez.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">4. Stockage</h3>
              <p>Vos données sont stockées sur Firebase (Google Cloud) en Europe, avec un niveau de sécurité élevé.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">5. Vos droits</h3>
              <p>Vous pouvez à tout moment :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Modifier vos informations depuis votre profil</li>
                <li>Supprimer votre compte (Centre de sécurité)</li>
                <li>Demander l'export de vos données</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">6. Cookies</h3>
              <p>Nous utilisons des cookies uniquement pour maintenir votre session de connexion.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-1">7. Contact</h3>
              <p>Pour exercer vos droits : urukundo.app@gmail.com</p>
            </section>
          </>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 accent-red-500" />
          <span className="text-sm text-gray-600">
            J'ai lu et j'accepte les <span className="text-red-500 font-medium">Conditions d'utilisation</span> et la <span className="text-red-500 font-medium">Politique de confidentialité</span> d'Urukundo.
          </span>
        </label>
        <button onClick={onAccept} disabled={!accepted}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
          Continuer 🇧🇮
        </button>
      </div>
    </div>
  );
};

export default LegalScreen;
