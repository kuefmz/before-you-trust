import { StoryForm } from "@/components/StoryForm";

export const metadata = {
  title: "Share your story",
  description:
    "Privately share a story, concern, feedback, or privacy request with the Before You Trust project.",
  robots: { index: true, follow: true },
};

export default function ShareYourStoryPage() {
  return (
    <div className="shell content-page story-page">
      <span className="eyebrow">Private by default</span>
      <h1>Share your story.</h1>
      <p className="lead">
        Stories can reveal where this tool needs to be better. Your submission
        is delivered privately by email; it is not posted publicly or stored in
        an application database.
      </p>

      <div className="story-layout">
        <StoryForm />
        <aside className="story-guidance">
          <h2>Before you send</h2>
          <ul>
            <li>Avoid unnecessary names, addresses or intimate details.</li>
            <li>Do not upload private documents or evidence here.</li>
            <li>
              If you describe another person, stick to what you experienced and
              distinguish allegations from established facts.
            </li>
            <li>
              Publication permission is separate and optional. Without it, your
              story is not licensed for public use.
            </li>
          </ul>
          <p>
            This form is not an emergency service. If you are in immediate
            danger, contact local emergency services or a qualified support
            organization.
          </p>
        </aside>
      </div>
    </div>
  );
}
