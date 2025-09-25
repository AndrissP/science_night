
import math
import random
import tkinter as tk
from tkinter import messagebox, ttk
from textwrap import dedent

# ----------------------------- Text Content -----------------------------------

HELP = dedent("""
  Goal: Look at the cloud-chamber sketch and choose the particle.

  Magnetic field: into the page (⊗). Initial motion is upward (↑).
  • Curve LEFT ⇒ positive charge (e.g., e⁺, μ⁺, p).
  • Curve RIGHT ⇒ negative charge (e.g., e⁻, μ⁻).
  • Tight curve/spiral ⇒ low momentum. Gentle arc ⇒ high momentum.
  • Track thickness (ionization):
      thin   ≈ light/fast (electrons/muons)
      thick  ≈ slow/heavy (proton)

  • No incoming primary but a displaced 'V' pair (two opposite-curving arms)
    ⇒ neutral converting/decaying:
      - photon conversion: e⁺e⁻ pair, faint and opposite curvature

  Tips: Don’t overthink momentum — relative tight vs gentle is enough!
""").strip()

# Keep only the requested seven options
CHOICES = [
    "electron (e−)",
    "positron (e+)",
    "muon (μ−)",
    "muon (μ+)",
    "photon (γ) → e⁺e⁻ pair",
    "proton (p)",
    "neutron (n) (no visible primary track)"
]

TRACK_COLOR = "crimson"

# --------------------------- Geometry helpers ---------------------------------

class World:
    def __init__(self, xmin=-10, xmax=10, ymin=-10, ymax=10, margin=40):
        self.xmin, self.xmax = xmin, xmax
        self.ymin, self.ymax = ymin, ymax
        self.margin = margin

    def to_canvas(self, x, y, width, height):
        """Map world (x,y) -> canvas (X,Y). y up in world, down in canvas."""
        W = width - 2*self.margin
        H = height - 2*self.margin
        X = self.margin + (x - self.xmin) / (self.xmax - self.xmin) * W
        Y = self.margin + (self.ymax - y) / (self.ymax - self.ymin) * H
        return X, Y

# ------------------------------ Drawing ---------------------------------------

def draw_axes(canvas, world):
    w = int(canvas['width']); h = int(canvas['height'])
    # y-axis
    x0,y0 = world.to_canvas(-9.0, -9.0, w, h)
    x1,y1 = world.to_canvas(-9.0,  9.0, w, h)
    canvas.create_line(x0, y0, x1, y1, width=1)
    canvas.create_polygon(x1, y1, x1-6, y1+12, x1+6, y1+12, fill='black')
    canvas.create_text(x1-15, y1-15, text='y', anchor='e')
    # x-axis
    x2,y2 = world.to_canvas(-9.0, -9.0, w, h)
    x3,y3 = world.to_canvas( 9.0, -9.0, w, h)
    canvas.create_line(x2, y2, x3, y3, width=1)
    canvas.create_polygon(x3, y3, x3-12, y3-6, x3-12, y3+6, fill='black')
    canvas.create_text(x3-10, y3+15, text='x', anchor='w')

def draw_Bfield(canvas, world):
    """Draw '⊗' motif grid and a clear note about direction."""
    w = int(canvas['width']); h = int(canvas['height'])
    xs = [-6, -2, 2, 6]
    ys = [6, 3, 0, -3, -6]
    for y in ys:
        for x in xs:
            cx, cy = world.to_canvas(x, y, w, h)
            r = 10
            canvas.create_oval(cx-r, cy-r, cx+r, cy+r, width=1)
            canvas.create_line(cx-r*0.7, cy-r*0.7, cx+r*0.7, cy+r*0.7, width=1)
            canvas.create_line(cx-r*0.7, cy+r*0.7, cx+r*0.7, cy-r*0.7, width=1)
    canvas.create_text(10, 10, text="B field:", anchor="nw", font=("TkDefaultFont", 11, "bold"))
    canvas.create_text(62, 3, text="⊗", anchor="nw", font=("TkDefaultFont", 22, "bold"))
    canvas.create_text(80, 10, text="into page", anchor="nw", font=("TkDefaultFont", 11, "bold"))

def polyline(canvas, pts, world, width=2, dash=None, fill=TRACK_COLOR):
    w = int(canvas['width']); h = int(canvas['height'])
    xy = []
    for (x,y) in pts:
        X,Y = world.to_canvas(x,y,w,h)
        xy.extend([X,Y])
    canvas.create_line(*xy, width=width, smooth=True, splinesteps=24, dash=dash, fill=fill)

def spiral(center, r_start, r_end, turns=3.0, ccw=True, npts=500, start_angle=0.0):
    """Archimedean spiral polyline around fixed center."""
    cx, cy = center
    pts = []
    theta0 = start_angle
    theta1 = start_angle + (2*math.pi*turns if ccw else -2*math.pi*turns)
    for i in range(npts):
        t = i / (npts-1)
        th = theta0 + t*(theta1 - theta0)
        r = r_start + t*(r_end - r_start)
        x = cx + r*math.cos(th)
        y = cy + r*math.sin(th)
        pts.append((x,y))
    return pts

def arc(center, radius, angle_start, angle_end, ccw=True, npts=180):
    cx, cy = center
    pts = []
    th0 = angle_start
    th1 = angle_end if ccw else angle_start - (angle_end - angle_start)
    for i in range(npts):
        t = i / (npts-1)
        th = th0 + t*(th1 - th0)
        x = cx + radius*math.cos(th)
        y = cy + radius*math.sin(th)
        pts.append((x,y))
    return pts

# ----------------------------- Scenarios --------------------------------------

def make_scenarios():
    """
    Each scenario has:
      - 'answer': one of CHOICES
      - 'explain': explanation
      - 'tags': dict with simple hints {'sign','curv','ion','special'}
      - 'draw': function(canvas, world)
    Only the requested seven particle types are included.
    """
    scenarios = []

    THIN, THICK = 2, 5

    # Start tracks in midpage to keep arcs on-screen
    y0 = 0.0

    # e+ left tight spiral (starts at origin, initial motion upward)
    def draw_eplus(canvas, world):
        r_start, r_end = 3.0, 0.6
        cx = -r_start; cy = y0
        pts = spiral(center=(cx,cy), r_start=r_start, r_end=r_end, turns=3.2, ccw=True, start_angle=0.0)
        polyline(canvas, pts, world, width=THIN)

    scenarios.append(dict(
        answer="positron (e+)",
        explain="Left-curving tight spiral ⇒ low-p, positive, light → e⁺.",
        tags={"sign":"+","curv":"tight","ion":"faint","special":None},
        draw=draw_eplus
    ))

    # e− right tight spiral
    def draw_eminus(canvas, world):
        r_start, r_end = 3.0, 0.6
        cx = +r_start; cy = y0
        pts = spiral(center=(cx,cy), r_start=r_start, r_end=r_end, turns=3.2, ccw=False, start_angle=math.pi)
        polyline(canvas, pts, world, width=THIN)

    scenarios.append(dict(
        answer="electron (e−)",
        explain="Right-curving tight spiral ⇒ low-p, negative, very light → e⁻.",
        tags={"sign":"-","curv":"tight","ion":"faint","special":None},
        draw=draw_eminus
    ))

    # μ− right gentle arc (minimum ionizing, thin)
    def draw_muminus(canvas, world):
        r = 20.0; cx = +r; cy = y0
        # Limit arc angle so it stays inside world vertically
        pts = arc(center=(cx,cy), radius=r, angle_start=math.pi, angle_end=math.pi-0.5, ccw=False, npts=160)
        polyline(canvas, pts, world, width=THIN)

    scenarios.append(dict(
        answer="muon (μ−)",
        explain="Long gentle right arc; thin ionization → high-p negative MIP → μ⁻.",
        tags={"sign":"-","curv":"gentle","ion":"thin","special":None},
        draw=draw_muminus
    ))

    # μ+ left gentle arc (minimum ionizing, thin)
    def draw_muplus(canvas, world):
        r = 20.0; cx = -r; cy = y0
        pts = arc(center=(cx,cy), radius=r, angle_start=0.0, angle_end=0.5, ccw=True, npts=160)
        polyline(canvas, pts, world, width=THIN)

    scenarios.append(dict(
        answer="muon (μ+)",
        explain="Long gentle left arc; thin ionization → high-p positive MIP → μ⁺.",
        tags={"sign":"+","curv":"gentle","ion":"thin","special":None},
        draw=draw_muplus
    ))

    # proton left gentle arc, thick
    def draw_proton(canvas, world):
        r = 20.0; cx = -r; cy = y0
        pts = arc(center=(cx,cy), radius=r, angle_start=0.0, angle_end=0.5, ccw=True, npts=160)
        polyline(canvas, pts, world, width=THICK)

    scenarios.append(dict(
        answer="proton (p)",
        explain="Left gentle arc with heavy dE/dx (thick) → slow heavy positive → proton.",
        tags={"sign":"+","curv":"gentle","ion":"thick","special":None},
        draw=draw_proton
    ))

    # photon conversion: displaced V with faint opposite-curving arms
    def draw_gamma_pair(canvas, world):
        vx, vy = 0.0, 0.0  # centered vertex
        r = 6.0
        # e+ (left-curving, thin)
        cx1 = vx - r; cy1 = vy
        pts1 = arc(center=(cx1,cy1), radius=r, angle_start=0.0, angle_end=0.9, ccw=True, npts=120)
        polyline(canvas, pts1, world, width=THIN)
        # e- (right-curving, thin)
        cx2 = vx + r; cy2 = vy
        pts2 = arc(center=(cx2,cy2), radius=r, angle_start=math.pi, angle_end=math.pi-0.9, ccw=False, npts=120)
        polyline(canvas, pts2, world, width=THIN)
        # vertex marker
        w = int(canvas['width']); h = int(canvas['height'])
        X,Y = world.to_canvas(vx,vy,w,h)
        canvas.create_oval(X-3,Y-3,X+3,Y+3, fill='black', outline='')

    scenarios.append(dict(
        answer="photon (γ) → e⁺e⁻ pair",
        explain="No incoming track; displaced V with opposite-curving faint arms → γ conversion to e⁺e⁻.",
        tags={"sign":"0","curv":"pair","ion":"faint","special":"conversion"},
        draw=draw_gamma_pair
    ))

    # neutron — show nothing (no text, no primary track)
    def draw_neutron(canvas, world):
        # Intentionally draw nothing for the track itself.
        # Background (axes, B-field, arrow stub) is managed elsewhere.
        pass

    scenarios.append(dict(
        answer="neutron (n) (no visible primary track)",
        explain="No charged track; neutral particle. (Sometimes a short recoil stub.)",
        tags={"sign":"0","curv":"none","ion":"none","special":None},
        draw=draw_neutron
    ))

    return scenarios

# ------------------------------- App Frames -----------------------------------

class TitlePage(ttk.Frame):
    def __init__(self, master, on_play, on_clues, **kwargs):
        super().__init__(master, **kwargs)
        self.columnconfigure(0, weight=1)
        ttk.Label(self, text="Cloud Chamber Trainer", font=("TkDefaultFont", 18, "bold")).grid(row=0, column=0, pady=(20,10), padx=20)
        ttk.Label(self, text="Learn to read tracks like a detector physicist.", font=("TkDefaultFont", 11)).grid(row=1, column=0, pady=(0,20))

        btns = ttk.Frame(self)
        btns.grid(row=2, column=0, pady=10)
        ttk.Button(btns, text="Play", command=on_play).pack(side="left", padx=6)
        ttk.Button(btns, text="Read the clues", command=on_clues).pack(side="left", padx=6)
        ttk.Button(btns, text="Quit", command=self.quit).pack(side="left", padx=6)

        # Create a frame to hold the B field description with larger ⊗ symbol
        bfield_frame = ttk.Frame(self)
        bfield_frame.grid(row=3, column=0, pady=(20,10))
        
        ttk.Label(bfield_frame, text="B field is into the page (", font=("TkDefaultFont", 10, "italic")).pack(side="left")
        ttk.Label(bfield_frame, text="⊗", font=("TkDefaultFont", 20)).pack(side="left")
        ttk.Label(bfield_frame, text="). Initial motion upward (↑).", font=("TkDefaultFont", 10, "italic")).pack(side="left")

class CluesPage(ttk.Frame):
    def __init__(self, master, on_back, **kwargs):
        super().__init__(master, **kwargs)
        self.world = World()
        self.scenarios = make_scenarios()

        # Layout
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        hdr = ttk.Frame(self, padding=10)
        hdr.grid(row=0, column=0, sticky="ew")
        ttk.Label(hdr, text="How to read the clues", font=("TkDefaultFont", 14, "bold")).pack(side="left")
        ttk.Button(hdr, text="Back", command=on_back).pack(side="right")

        body = ttk.Frame(self, padding=10)
        body.grid(row=1, column=0, sticky="nsew")
        body.columnconfigure(0, weight=1)
        body.columnconfigure(1, weight=0)
        body.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(body, width=700, height=600, bg="white", highlightthickness=1, highlightbackground="#bbb")
        self.canvas.grid(row=0, column=0, sticky="nsew", padx=(0,10))

        right = ttk.Frame(body)
        right.grid(row=0, column=1, sticky="ns")
        self.help_txt = tk.Text(right, width=40, height=28, wrap="word")
        self.help_txt.insert("1.0", HELP)
        self.help_txt.configure(state="disabled")
        self.help_txt.grid(row=0, column=0, sticky="n")

        ttk.Button(right, text="Show example", command=self.show_example).grid(row=1, column=0, pady=(8,0))

        self.clue_lbl = ttk.Label(self, text="", font=("TkDefaultFont", 11))
        self.clue_lbl.grid(row=2, column=0, pady=8)

        self.draw_background()

    def draw_background(self):
        self.canvas.delete("all")
        draw_Bfield(self.canvas, self.world)
        draw_axes(self.canvas, self.world)
        # initial upward stub centered (midpage)
        w = int(self.canvas['width']); h = int(self.canvas['height'])
        x0,y0 = self.world.to_canvas(0.0, -0.5, w, h)
        x1,y1 = self.world.to_canvas(0.0,  0.5, w, h)
        self.canvas.create_line(x0, y0, x1, y1, width=3)
        self.canvas.create_text(x1+8, y1-10, text="↑", font=("TkDefaultFont", 12, "bold"))

    def show_example(self):
        self.draw_background()
        s = random.choice(self.scenarios)
        s["draw"](self.canvas, self.world)
        tags = s["tags"]
        tag_bits = []
        if tags.get("special") == "conversion":
            tag_bits.append("conversion V with opposite curvature")
        else:
            if tags["sign"] in {"+","-"}:
                tag_bits.append("turns " + ("left (+)" if tags["sign"]=="+" else "right (−)"))
            elif tags["sign"] == "0":
                tag_bits.append("neutral (no primary)")
            tag_bits.append(f"{tags['curv']} curvature")
            if tags["ion"] != "none":
                tag_bits.append(f"{tags['ion']} ionization")
        self.clue_lbl.config(text="Clues: " + ", ".join(tag_bits))

class GamePage(ttk.Frame):
    def __init__(self, master, on_back, **kwargs):
        super().__init__(master, **kwargs)
        self.world = World()
        self.scenarios = make_scenarios()
        self.current = None
        self.rounds = 0
        self.score = 0
        self.answered = False

        # Layout
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(self, width=720, height=680, bg="white", highlightthickness=1, highlightbackground="#bbb")
        self.canvas.grid(row=0, column=0, sticky="nsew")

        side = ttk.Frame(self, padding=10)
        side.grid(row=0, column=1, sticky="ns")
        side.columnconfigure(0, weight=1)

        ttk.Label(side, text="What is this most likely?", font=("TkDefaultFont", 12, "bold")).grid(row=0, column=0, sticky="w", pady=(0,6))

        self.choice_var = tk.StringVar(value="")
        self.choice_buttons = []
        for i, c in enumerate(CHOICES):
            rb = ttk.Radiobutton(side, text=c, variable=self.choice_var, value=c)
            rb.grid(row=1+i, column=0, sticky="w", pady=1)
            self.choice_buttons.append(rb)

        btn_frame = ttk.Frame(side)
        btn_frame.grid(row=1+len(CHOICES), column=0, pady=(10,6), sticky="ew")
        self.submit_btn = ttk.Button(btn_frame, text="Submit", command=self.on_submit)
        self.submit_btn.pack(side="left", padx=(0,6))
        self.next_btn = ttk.Button(btn_frame, text="Next", command=self.on_next)
        self.next_btn.pack(side="left")
        ttk.Button(btn_frame, text="Help", command=self.show_help).pack(side="left", padx=(6,0))
        ttk.Button(btn_frame, text="Quit to Title", command=on_back).pack(side="left", padx=(6,0))

        self.msg = tk.Text(side, height=8, width=40, wrap="word")
        self.msg.grid(row=2+len(CHOICES), column=0, sticky="ew", pady=(6,6))
        self.msg.configure(state="disabled")

        self.score_lbl = ttk.Label(side, text="Score: 0/0")
        self.score_lbl.grid(row=3+len(CHOICES), column=0, sticky="w")

        self.new_round()

    def draw_background(self):
        self.canvas.delete("all")
        draw_Bfield(self.canvas, self.world)
        draw_axes(self.canvas, self.world)
        # initial upward stub centered (midpage)
        w = int(self.canvas['width']); h = int(self.canvas['height'])
        x0,y0 = self.world.to_canvas(0.0, -0.5, w, h)
        x1,y1 = self.world.to_canvas(0.0,  0.5, w, h)
        self.canvas.create_line(x0, y0, x1, y1, width=3)
        self.canvas.create_text(x1+8, y1-10, text="↑", font=("TkDefaultFont", 12, "bold"))

    def new_round(self):
        self.answered = False
        self.choice_var.set("")
        self.msg_set("Pick the particle based on curvature (sign), radius (momentum), and line width (dE/dx).")
        self.draw_background()
        self.current = random.choice(self.scenarios)
        self.current["draw"](self.canvas, self.world)

    def on_submit(self):
        if self.answered:
            return
        sel = self.choice_var.get()
        if not sel:
            messagebox.showinfo("Choose one", "Please select an answer.")
            return
        self.rounds += 1
        correct = (sel == self.current["answer"])
        if correct:
            self.score += 1
        self.answered = True
        verdict = "✓ Correct!" if correct else "✗ Not quite."
        tags = self.current["tags"]
        tag_bits = []
        if tags.get("special") == "conversion":
            tag_bits.append("conversion V with opposite curvature")
        else:
            if tags["sign"] in {"+","-"}:
                tag_bits.append("turns " + ("left (+)" if tags["sign"]=="+" else "right (−)"))
            elif tags["sign"] == "0":
                tag_bits.append("neutral (no primary)")
            tag_bits.append(f"{tags['curv']} curvature")
            if tags["ion"] != "none":
                tag_bits.append(f"{tags['ion']} ionization")
        text = (f"Answer: {self.current['answer']}\n\n{verdict}\n\n"
                f"Reasoning: {self.current['explain']}\n\n"
                f"Clues: {', '.join(tag_bits)}")
        self.msg_set(text)
        self.update_score()

    def on_next(self):
        self.new_round()

    def update_score(self):
        self.score_lbl.config(text=f"Score: {self.score}/{self.rounds}")

    def msg_set(self, text):
        self.msg.configure(state="normal")
        self.msg.delete("1.0", "end")
        self.msg.insert("1.0", text)
        self.msg.configure(state="disabled")

    def show_help(self):
        messagebox.showinfo("How to read the clues", HELP)

# ------------------------------ App Shell -------------------------------------

class CloudChamberApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Cloud Chamber Trainer (GUI)")
        self.geometry("1024x720")
        self._frame = None
        self.show_title()

    def _swap(self, new_frame):
        if self._frame is not None:
            self._frame.destroy()
        self._frame = new_frame
        self._frame.pack(fill="both", expand=True)

    def show_title(self):
        self._swap(TitlePage(self, on_play=self.show_game, on_clues=self.show_clues))

    def show_clues(self):
        self._swap(CluesPage(self, on_back=self.show_title))

    def show_game(self):
        self._swap(GamePage(self, on_back=self.show_title))

# --------------------------------- Main ---------------------------------------

if __name__ == "__main__":
    app = CloudChamberApp()
    app.mainloop()
