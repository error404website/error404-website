import { AnimatePresence, motion, useInView } from "framer-motion";
import React from "react";

const EMPTY_FORM = {
  callsign: "",
  email: "",
  venue: "",
  location: "",
  date: "",
  message: "",
};

function SignalMeter({ sent }) {
  const bars = Array.from(
    {
      length: 64,
    },
    (r, i) => {
      const s = Math.sin(i * 0.35) * 0.5 + 0.5;
      return Math.round(15 + s * 75);
    },
  );
  const barColors = [
    ["#FF00E5", "#00EFFF"],
    ["#FF00E5", "#00EFFF"],
    ["#FF00E5", "#00EFFF"],
    ["#FF00E5", "#00EFFF"],
  ];
  return (
    <div className="flex items-center gap-[2px] h-8 w-full">
      {bars.map((r, i) => {
        const [s, o] = barColors[Math.floor(i / 16)];
        const a = i % 2 === 0 ? s : o;
        return (
          <motion.div
            className="flex-1 rounded-full origin-center"
            style={{
              height: `${r}%`,
              background: sent ? `${a}${r > 60 ? "cc" : "55"}` : `${a}${r > 60 ? "66" : "22"}`,
            }}
            animate={
              sent
                ? {
                    scaleY: [1, 1.4 + Math.random() * 0.6, 1],
                    opacity: [0.4, 0.9, 0.4],
                  }
                : {
                    scaleY: [1, 0.6 + Math.sin(i) * 0.4, 1],
                    opacity: [0.12, 0.28, 0.12],
                  }
            }
            transition={{
              duration: sent ? 0.6 + (i % 7) * 0.06 : 2.4 + (i % 5) * 0.3,
              delay: i * 0.01,
              repeat: 1 / 0,
              ease: "easeInOut",
            }}
            key={i}
          />
        );
      })}
    </div>
  );
}

function Field({ id, errorId, label, tag, children, error, required }) {
  return (
    <div className="group/field min-w-0">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={id}
          className="font-mono text-[9px] tracking-[0.28em] text-ghost/30 transition-colors duration-200 group-focus-within/field:text-ghost/55"
        >
          {label}
          {required && (
            <span className="text-magenta/60 ml-1" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">{" (required)"}</span>}
        </label>
        <span className="font-mono text-[8px] text-ghost/15 tracking-widest" aria-hidden="true">
          {tag}
        </span>
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{
              opacity: 0,
              y: -3,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.18,
            }}
            className="font-mono text-[9px] text-magenta/65 mt-1.5 tracking-[0.12em]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass = (e) =>
  [
    "w-full font-mono text-[0.82rem] text-ghost placeholder:text-ghost/12",
    "px-4 py-4 outline-none transition-all duration-400",
    "border",
    e
      ? "border-magenta/45 focus:border-magenta/65 bg-magenta/[0.03]"
      : "border-ghost/7 focus:border-ghost/22 bg-void/30 focus:bg-void/50",
  ].join(" ");

function TransmissionSent({ onReset }) {
  const lines = [
    {
      text: "SIGNAL RECEIVED",
      color: "#00EFFF",
      delay: 0.1,
    },
    {
      text: "TRANSMISSION STORED",
      color: "#F4F4F8",
      delay: 0.5,
    },
    {
      text: "RESPONSE PENDING",
      color: "rgba(244,244,248,0.45)",
      delay: 0.9,
    },
  ];
  return (
    <motion.div
      initial={{
        opacity: 0,
        filter: "blur(6px)",
      }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
      }}
      exit={{
        opacity: 0,
        filter: "blur(4px)",
      }}
      transition={{
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
      key="success"
    >
      <motion.div
        initial={{
          scale: 0.3,
          rotate: -90,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          rotate: 0,
          opacity: 1,
        }}
        transition={{
          duration: 0.7,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative w-20 h-20 mb-12"
      >
        <div
          className="absolute inset-0 rotate-45"
          style={{
            border: "1px solid rgba(0,239,255,0.35)",
            background: "rgba(0,239,255,0.04)",
            boxShadow: "0 0 40px rgba(0,239,255,0.15), inset 0 0 20px rgba(0,239,255,0.05)",
          }}
        />
        <motion.div
          className="absolute -inset-3 rotate-45"
          style={{
            border: "1px solid rgba(0,239,255,0.12)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2.4,
            repeat: 1 / 0,
            ease: "easeInOut",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
            <motion.path
              d="M5 12.5l5 5 9-9"
              stroke="#00EFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{
                pathLength: 0,
              }}
              animate={{
                pathLength: 1,
              }}
              transition={{
                duration: 0.55,
                delay: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </svg>
        </div>
      </motion.div>
      <div className="space-y-3 mb-12">
        {lines.map(({ text, color, delay }) => (
          <motion.p
            initial={{
              opacity: 0,
              y: 10,
              filter: "blur(4px)",
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
            }}
            transition={{
              duration: 0.55,
              delay: delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={
              text === "SIGNAL RECEIVED"
                ? "font-heading font-semibold text-2xl tracking-tight"
                : text === "TRANSMISSION STORED"
                  ? "font-mono text-[10px] tracking-[0.35em]"
                  : "font-mono text-[9px] tracking-[0.28em]"
            }
            style={{
              color: color,
            }}
            key={text}
          >
            {text}
          </motion.p>
        ))}
      </div>
      <motion.div
        initial={{
          opacity: 0,
          scaleX: 0.4,
        }}
        animate={{
          opacity: 1,
          scaleX: 1,
        }}
        transition={{
          duration: 0.6,
          delay: 1.1,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full max-w-sm mb-10"
      >
        <SignalMeter sent={true} />
      </motion.div>
      <motion.button
        onClick={onReset}
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 1.4,
          duration: 0.4,
        }}
        className="e-b3"
      >
        OPEN NEW CHANNEL
      </motion.button>
    </motion.div>
  );
}

export function Signal() {
  const sectionRef = React.useRef(null);
  const inView = useInView(sectionRef, {
    once: true,
    margin: "-80px",
  });
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [touched, setTouched] = React.useState({});
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const fieldIds = {
    callsign: React.useId(),
    email: React.useId(),
    venue: React.useId(),
    location: React.useId(),
    date: React.useId(),
    message: React.useId(),
  };
  const errorIds = {
    callsign: React.useId(),
    email: React.useId(),
    venue: React.useId(),
  };
  const updateField = (S) => (C) =>
    setForm((E) => ({
      ...E,
      [S]: C.target.value,
    }));
  const touchField = (S) => () =>
    setTouched((C) => ({
      ...C,
      [S]: true,
    }));
  const errors = {
    callsign: touched.callsign && !form.callsign.trim() ? "CALLSIGN REQUIRED" : undefined,
    email:
      touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        ? "INVALID TRANSMISSION ADDRESS"
        : undefined,
    venue: touched.venue && !form.venue.trim() ? "VENUE OR ORGANISATION REQUIRED" : undefined,
  };
  const isValid = form.callsign.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.venue.trim();
  const encodeForm = (S) =>
    Object.keys(S)
      .map((C) => encodeURIComponent(C) + "=" + encodeURIComponent(S[C]))
      .join("&");
  const handleSubmit = async (S) => {
    if (
      (S.preventDefault(),
      setTouched({
        callsign: true,
        email: true,
        venue: true,
      }),
      !(!isValid || sending))
    ) {
      setSending(true);
      setFailed(false);
      try {
        const C = await fetch("/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: encodeForm({
            "form-name": "contact",
            "bot-field": "",
            ...form,
          }),
        });
        if (!C.ok) throw new Error(String(C.status));
        setSent(true);
      } catch {
        setFailed(true);
      } finally {
        setSending(false);
      }
    }
  };
  const resetForm = () => {
    setSent(false);
    setFailed(false);
    setForm(EMPTY_FORM);
    setTouched({});
  };
  return (
    <section
      id="signal"
      ref={sectionRef}
      className="relative min-h-screen py-20 sm:py-28 lg:py-32 px-4 sm:px-6 flex flex-col justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-void via-[#07080F] to-void pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 50% at 70% 50%, rgba(255,0,229,0.04) 0%, transparent 70%), radial-gradient(ellipse 45% 50% at 20% 50%, rgba(161,0,255,0.04) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,244,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(244,244,248,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative max-w-7xl mx-auto w-full">
        <div className="mb-14 sm:mb-20">
          <motion.div
            initial={{
              opacity: 0,
              x: -12,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    x: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="w-8 h-px e-sline" />
            <span className="font-mono text-[9px] text-cyan/40 tracking-[0.45em] uppercase">
              Section_04 / Signal
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan/10 to-transparent max-w-[100px]" />
          </motion.div>
          <motion.h2
            initial={{
              opacity: 0,
              y: 28,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 1.1,
              delay: 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="font-heading font-extrabold text-ghost leading-[0.9] tracking-tight mb-6"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
            }}
          >
            <span className="e-grad">SIGNAL</span>
          </motion.h2>
          <motion.p
            initial={{
              opacity: 0,
              y: 10,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="font-mono text-[9px] tracking-[0.35em] text-ghost/28 mb-3 uppercase"
          >
            Open Transmission Channel
          </motion.p>
          <motion.p
            initial={{
              opacity: 0,
              y: 8,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 0.75,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="font-body text-ghost/35 leading-[1.8] max-w-md"
            style={{
              fontSize: "clamp(0.84rem, 1.5vw, 0.92rem)",
            }}
          >
            {"Book "}
            <span className="e-name font-heading">ERROR_404</span>
            {" for shows, events, and live performance."}
          </motion.p>
        </div>
        <motion.div
          initial={{
            opacity: 0,
            scaleX: 0.3,
            clipPath: "inset(0% 0% 100% 0%)",
          }}
          animate={
            inView
              ? {
                  opacity: 1,
                  scaleX: 1,
                  clipPath: "inset(0% 0% 0% 0%)",
                  transitionEnd: {
                    clipPath: "none",
                  },
                }
              : {}
          }
          transition={{
            duration: 1.1,
            delay: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mb-14 origin-left"
        >
          <SignalMeter sent={sent} />
        </motion.div>
        <motion.div
          initial={{
            opacity: 0,
            y: 24,
            clipPath: "inset(0% 0% 100% 0%)",
          }}
          animate={
            inView
              ? {
                  opacity: 1,
                  y: 0,
                  clipPath: "inset(0% 0% 0% 0%)",
                  transitionEnd: {
                    clipPath: "none",
                  },
                }
              : {}
          }
          transition={{
            duration: 0.9,
            delay: 0.22,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="e5-frame relative overflow-hidden"
          style={{
            background: "rgba(3,4,9,0.88)",
            border: "1px solid rgba(244,244,248,0.08)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow:
              "0 0 0 1px rgba(255,0,229,0.06), 0 0 40px rgba(255,0,229,0.08), 0 40px 100px rgba(0,0,0,0.65)",
          }}
        >
          <div className="absolute top-0 inset-x-0 h-px divider-neon" />
          <div
            className="flex items-center justify-between px-6 py-3 border-b"
            style={{
              borderColor: "rgba(244,244,248,0.05)",
            }}
          >
            <span
              className="e8c"
              style={{
                "--c": "#FF00E5",
              }}
            >
              <i />
              <span>CHANNEL OPEN</span>
            </span>
            <span className="font-mono text-[9px] text-ghost/15 tracking-widest">TX // ERROR_404</span>
          </div>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {sent ? "Signal received. Transmission stored." : ""}
          </div>
          <AnimatePresence mode="wait">
            {sent ? (
              <TransmissionSent onReset={resetForm} key="success" />
            ) : (
              <motion.form
                name="contact"
                method="POST"
                data-netlify="true"
                netlify-honeypot="bot-field"
                onSubmit={handleSubmit}
                noValidate={true}
                initial={{
                  opacity: 0,
                  y: 16,
                  filter: "blur(4px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  filter: "blur(4px)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="p-7 sm:p-9"
                key="form"
              >
                <input type="hidden" name="form-name" value="contact" />
                <p className="hidden">
                  <label>
                    {"Don't fill this out: "}
                    <input name="bot-field" />
                  </label>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <Field
                    id={fieldIds.callsign}
                    errorId={errorIds.callsign}
                    label="CALLSIGN / NAME"
                    tag="STR_01"
                    error={errors.callsign}
                    required={true}
                  >
                    <input
                      id={fieldIds.callsign}
                      type="text"
                      autoComplete="name"
                      placeholder="Your name or alias"
                      value={form.callsign}
                      onChange={updateField("callsign")}
                      onBlur={touchField("callsign")}
                      aria-required="true"
                      aria-invalid={!!errors.callsign}
                      aria-describedby={errors.callsign ? errorIds.callsign : undefined}
                      className={inputClass(!!errors.callsign)}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                  <Field
                    id={fieldIds.email}
                    errorId={errorIds.email}
                    label="EMAIL ADDRESS"
                    tag="STR_02"
                    error={errors.email}
                    required={true}
                  >
                    <input
                      id={fieldIds.email}
                      type="email"
                      autoComplete="email"
                      placeholder="you@domain.com"
                      value={form.email}
                      onChange={updateField("email")}
                      onBlur={touchField("email")}
                      aria-required="true"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? errorIds.email : undefined}
                      className={inputClass(!!errors.email)}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                  <Field
                    id={fieldIds.venue}
                    errorId={errorIds.venue}
                    label="VENUE / ORGANISATION"
                    tag="STR_03"
                    error={errors.venue}
                    required={true}
                  >
                    <input
                      id={fieldIds.venue}
                      type="text"
                      placeholder="Venue name or promoter"
                      value={form.venue}
                      onChange={updateField("venue")}
                      onBlur={touchField("venue")}
                      aria-required="true"
                      aria-invalid={!!errors.venue}
                      aria-describedby={errors.venue ? errorIds.venue : undefined}
                      className={inputClass(!!errors.venue)}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                  <Field id={fieldIds.location} label="LOCATION" tag="STR_04">
                    <input
                      id={fieldIds.location}
                      type="text"
                      placeholder="City, Country"
                      value={form.location}
                      onChange={updateField("location")}
                      onBlur={touchField("location")}
                      className={inputClass(false)}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                  <Field id={fieldIds.date} label="EVENT DATE" tag="DATE_01">
                    <input
                      id={fieldIds.date}
                      type="date"
                      value={form.date}
                      onChange={updateField("date")}
                      onBlur={touchField("date")}
                      className={inputClass(false) + " [color-scheme:dark]"}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                </div>
                <div className="mb-7">
                  <Field id={fieldIds.message} label="MESSAGE" tag="STR_05">
                    <textarea
                      id={fieldIds.message}
                      rows={4}
                      placeholder="Tell the machine what you need. Set requirements, capacity, any relevant context."
                      value={form.message}
                      onChange={updateField("message")}
                      onBlur={touchField("message")}
                      className={inputClass(false) + " resize-none leading-relaxed"}
                      style={{
                        caretColor: "#FF00E5",
                      }}
                    />
                  </Field>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[8px] text-ghost/18 tracking-[0.18em]">
                      REQUIRED FIELDS MARKED *
                    </p>
                    <AnimatePresence>
                      {failed && (
                        <motion.p
                          role="alert"
                          initial={{
                            opacity: 0,
                            y: -3,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                          }}
                          className="font-mono text-[9px] text-magenta/70 tracking-[0.12em]"
                        >
                          TRANSMISSION FAILED — CHECK CONNECTION & RETRY
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.button
                    type="submit"
                    disabled={sending}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className={
                      (isValid ? "e-b1" : "e-b2 e-b-off") +
                      " relative w-full sm:w-auto shrink-0 font-mono text-[10px] tracking-[0.28em] px-8 py-4 sm:py-3.5 min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/60 disabled:cursor-wait"
                    }
                  >
                    <span className="relative z-10">{sending ? "TRANSMITTING…" : "TRANSMIT"}</span>
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={
            inView
              ? {
                  opacity: 1,
                }
              : {}
          }
          transition={{
            duration: 0.6,
            delay: 0.5,
          }}
          className="font-mono text-[8px] text-ghost/15 tracking-[0.22em] mt-8 text-center"
        >
          ALL TRANSMISSIONS ENCRYPTED END TO END // ARCHIVE_404
        </motion.p>
      </div>
    </section>
  );
}
