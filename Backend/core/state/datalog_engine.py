"""
Singleton Engine maelys-datalog pour le moteur d'état.

Un Engine par process, domain enregistré une seule fois.
Utilise la variante Inline Dynamic : register_domain() puis load_inline_ruleset().

Les règles sont STATIQUES (pas de string literals) — la classification des policies
se fait via des prédicats EDB (is_always, is_direct, is_only), ce qui évite
le problème des atoms inconnus dans le registre de domaine.
"""
import sys
import os

# Ajouter le binding Python de maelys-datalog au path si nécessaire
_MAELYS_BINDING_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'maelys-datalog', 'bindings', 'python')

if os.path.isdir(_MAELYS_BINDING_PATH) and _MAELYS_BINDING_PATH not in sys.path:
    sys.path.insert(0, os.path.abspath(_MAELYS_BINDING_PATH))

from maelys_datalog import Engine, Predicate, PRED_EDB, PRED_IDB, PRED_QUERY

_engine = None
_ruleset = None

DOMAIN_NAME = "medical_access_control"

PREDICATES = [
    Predicate('explored',     1, PRED_EDB),          # Topic déjà exploré dans la session
    Predicate('current_slot', 1, PRED_EDB),           # Target slot de la question courante
    Predicate('has_policy',   2, PRED_EDB),            # (fact_id, policy_string)
    Predicate('is_always',    1, PRED_EDB),            # Policy "direct_if_asked" (toujours OK)
    Predicate('is_direct',    2, PRED_EDB),            # (policy_string, topic) — autorisé si topic exploré
    Predicate('is_only',      2, PRED_EDB),            # (policy_string, topic) — autorisé si exploré + current_slot
    Predicate('is_reference', 1, PRED_EDB),            # Fait de type "reference" (toujours autorisé)
    Predicate('allow',        1, PRED_IDB | PRED_QUERY),  # Fait autorisé à être révélé
    Predicate('blocked',      1, PRED_IDB | PRED_QUERY),  # Fait bloqué
]

# Règles STATIQUES — pas de string literals, que des variables.
# La sémantique des policies est encodée via les prédicats EDB is_always/is_direct/is_only.
RULES_SOURCE = (
    'allow(F) :- is_reference(F).\n'
    'allow(F) :- has_policy(F, P), is_always(P).\n'
    'allow(F) :- has_policy(F, P), is_direct(P, T), explored(T).\n'
    'allow(F) :- has_policy(F, P), is_only(P, T), explored(T), current_slot(T).\n'
    'blocked(F) :- has_policy(F, P), not(allow(F)).\n'
)


def get_engine():
    """Retourne le singleton Engine, crée-le et enregistre le domaine si nécessaire."""
    global _engine
    if _engine is None:
        _engine = Engine()
        _engine.register_domain(DOMAIN_NAME, PREDICATES)
    return _engine


def get_ruleset():
    """Retourne le singleton Ruleset. Les règles sont statiques, un seul ruleset suffit."""
    global _ruleset
    engine = get_engine()
    if _ruleset is None:
        _ruleset = engine.load_inline_ruleset(DOMAIN_NAME, 'access.main', RULES_SOURCE)
    return _ruleset


def close_engine():
    """Ferme le singleton Engine proprement (ferme aussi le Ruleset)."""
    global _engine, _ruleset
    if _engine is not None:
        _engine.close()
        _engine = None
        _ruleset = None
