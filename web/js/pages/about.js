// Página de HONOR a los fundadores de la endolingüística.
import { mount } from "../dom.js";

export function render() {
  mount("#toolbar", "");
  mount("#view", `<div class="page">
    <div class="tribute">
      <div class="kicker">En honor a los fundadores de la endolingüística</div>
      <h1>Dra. Christiane S. Meulemans<br>Dr. José Ángel Elías</h1>
      <div class="aff">Fundación Dr. J. Meulemans</div>
    </div>

    <p class="lead">Esta herramienta lleva el nombre <b>Meulemans</b> en homenaje a quienes fundaron la
    endolingüística y hicieron posible que hoy podamos preguntarle a una palabra por toda su historia.</p>

    <p>La endolingüística —el estudio de lo que las formas de las palabras recuerdan por debajo de su significado—
    fue creada y sistematizada por la <b>Dra. Christiane S. Meulemans</b> y el <b>Dr. José Ángel Elías</b>, ambos de la
    <b>Fundación Dr. J. Meulemans</b>. A ellos se debe el marco conceptual que este corpus busca servir con datos.</p>

    <p>Meulemans, el proyecto de software, es un esfuerzo <b>independiente</b> de integración y consulta: reúne fuentes
    lingüísticas existentes —cada una con su propia autoría y licencia— para explorarlas y correr experimentos. No
    reemplaza ni representa oficialmente a la Fundación; toma su nombre como un gesto de gratitud y reconocimiento a la
    disciplina y a sus fundadores.</p>

    <blockquote>«Lo que las palabras recuerdan.»</blockquote>

    <p class="mut">Para atribuciones, licencias y cómo citar, ver la sección <a href="#/legal">Legal</a>.</p>
  </div>`);
}
