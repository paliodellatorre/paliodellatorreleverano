– SISTEMA CLASSIFICA: UN SOLO RISULTATO PER NICKNAME E RIONE – 1) Tiene
solo il punteggio più alto per ogni giocatore – 2) Impedisce duplicati
futuri

– Elimina duplicati mantenendo il punteggio più alto DELETE FROM
pdt_jump_scores a USING pdt_jump_scores b WHERE a.nickname = b.nickname
AND a.rione = b.rione AND a.score < b.score;

– Crea vincolo per evitare duplicati futuri DO
BEGINIFNOTEXISTS(SELECT1FROMpg_(i)ndexesWHEREindexname = ′uniq_(p)dt_(j)ump_(p)layer′)THENCREATEUNIQUEINDEXuniq_(p)dt_(j)ump_(p)layerONpdt_(j)ump_(s)cores(nickname, rione); ENDIF; END
;
