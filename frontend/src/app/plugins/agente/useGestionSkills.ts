/* Gestion de skills en el modal de configuracion del agente. Encapsula el
 * listado, creacion, edicion y borrado de skills (5 estados del componente)
 * para que ModalConfigAgente no supere el maximo de useState. */
import {useEffect, useState} from 'react';
import {listarSkills, crearSkill, actualizarSkill, eliminarSkill} from './service';
import type {SkillAgente} from './service';

export interface GestionSkills {
    skills: SkillAgente[];
    skillsError: string | null;
    nuevaSkill: {nombre: string; descripcion: string};
    setNuevaSkill: (v: {nombre: string; descripcion: string}) => void;
    editandoId: string | null;
    setEditandoId: (id: string | null) => void;
    editando: {nombre: string; descripcion: string};
    setEditando: (v: {nombre: string; descripcion: string}) => void;
    crear: () => Promise<void>;
    alternar: (skill: SkillAgente) => Promise<void>;
    guardarEdicion: (skill: SkillAgente) => Promise<void>;
    eliminar: (id: string) => Promise<void>;
}

export function useGestionSkills(activo: boolean): GestionSkills {
    const [skills, setSkills] = useState<SkillAgente[]>([]);
    const [skillsError, setSkillsError] = useState<string | null>(null);
    const [nuevaSkill, setNuevaSkill] = useState({nombre: '', descripcion: ''});
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editando, setEditando] = useState({nombre: '', descripcion: ''});
    const mensaje = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

    useEffect(() => {
        if (activo) {
            setSkillsError(null);
            void listarSkills().then(setSkills).catch(e => setSkillsError(mensaje(e, 'No se pudieron cargar las skills')));
        }
    }, [activo]);

    const crear = async () => {
        const nombre = nuevaSkill.nombre.trim();
        const descripcion = nuevaSkill.descripcion.trim();
        if (!nombre || !descripcion) return;
        try {
            const skill = await crearSkill({nombre, descripcion, activa: true});
            setSkills(prev => [...prev, skill]);
            setNuevaSkill({nombre: '', descripcion: ''});
            setSkillsError(null);
        } catch (e) { setSkillsError(mensaje(e, 'No se pudo crear la skill')); }
    };

    const alternar = async (skill: SkillAgente) => {
        try {
            const actualizada = await actualizarSkill(skill.id, {activa: !skill.activa});
            setSkills(prev => prev.map(s => s.id === skill.id ? actualizada : s));
            setSkillsError(null);
        } catch (e) { setSkillsError(mensaje(e, 'No se pudo actualizar la skill')); }
    };

    const guardarEdicion = async (skill: SkillAgente) => {
        const nombre = editando.nombre.trim();
        const descripcion = editando.descripcion.trim();
        if (!nombre || !descripcion) return;
        try {
            const actualizada = await actualizarSkill(skill.id, {nombre, descripcion});
            setSkills(prev => prev.map(s => s.id === skill.id ? actualizada : s));
            setEditandoId(null);
            setSkillsError(null);
        } catch (e) { setSkillsError(mensaje(e, 'No se pudo guardar la skill')); }
    };

    const eliminar = async (id: string) => {
        try {
            await eliminarSkill(id);
            setSkills(prev => prev.filter(s => s.id !== id));
            setSkillsError(null);
        } catch (e) { setSkillsError(mensaje(e, 'No se pudo eliminar la skill')); }
    };

    return {skills, skillsError, nuevaSkill, setNuevaSkill, editandoId, setEditandoId, editando, setEditando, crear, alternar, guardarEdicion, eliminar};
}