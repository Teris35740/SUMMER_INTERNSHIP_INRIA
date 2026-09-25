"""
Singleton Engine maelys-datalog-next pour le moteur d'état.

Un Engine par process, domain enregistré une seule fois.
Utilise la variante Inline Dynamic : register_domain() puis load_inline_ruleset().

Les règles sont STATIQUES (pas de string literals) — la classification des policies
se fait via des prédicats EDB (is_always, is_direct, is_only), ce qui évite
le problème des atoms inconnus dans le registre de domaine.
"""
import sys
import os

# Ajouter le binding Python-Next de maelys-datalog au path si nécessaire
_MAELYS_BINDING_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'maelys-datalog', 'bindings', 'python-next')

if os.path.isdir(_MAELYS_BINDING_PATH) and _MAELYS_BINDING_PATH not in sys.path:
    sys.path.insert(0, os.path.abspath(_MAELYS_BINDING_PATH))

from maelys_datalog_next import Engine, Predicate

_engine = None
_ruleset = None

DOMAIN_NAME = "medical_access_control"

PREDICATES = [
    Predicate.edb('explored',     1),    # Topic déjà exploré dans la session
    Predicate.edb('current_slot', 1),    # Target slot de la question courante
    Predicate.edb('has_policy',   2),    # (fact_id, policy_string)
    Predicate.edb('is_always',    1),    # Policy "direct_if_asked" (toujours OK)
    Predicate.edb('is_direct',    2),    # (policy_string, topic) — autorisé si topic exploré
    Predicate.edb('is_only',      2),    # (policy_string, topic) — autorisé si exploré + current_slot
    Predicate.edb('is_reference', 1),    # Fait de type "reference" (toujours autorisé)
    Predicate.idb_query('allow',   1),   # Fait autorisé à être révélé
    Predicate.idb_query('blocked', 1),   # Fait bloqué
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
