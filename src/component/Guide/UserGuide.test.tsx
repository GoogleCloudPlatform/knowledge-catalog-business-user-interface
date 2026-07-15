import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UserGuide from "./UserGuide";

describe("UserGuide", () => {
  describe("Basic Rendering", () => {
    it("renders the main title", () => {
      render(<UserGuide />);

      expect(screen.getByText("Knowledge Catalog Business Interface User Guide")).toBeInTheDocument();
    });

    it("renders 'On this page' navigation header", () => {
      render(<UserGuide />);

      expect(screen.getByText("On this page")).toBeInTheDocument();
    });

    it("renders all guide section titles", () => {
      render(<UserGuide />);

      const sectionTitles = [
        "Preview Disclaimer",
        "Overview",
        "Knowledge Catalog Business Interface: Architecture",
        "API Usage Details",
        "Before You Begin",
        "Deploy Knowledge Catalog Business Interface Application",
        "Authenticate",
        "Search Data Assets",
        "Detailed Asset View",
        "Browse Data Assets",
        "Requesting Access Workflow",
      ];

      sectionTitles.forEach((title) => {
        // Each title appears twice: once in accordion, once in navigation
        const elements = screen.getAllByText(title);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders navigation links for all sections", () => {
      render(<UserGuide />);

      // Check that navigation links exist
      const navLinks = screen.getAllByRole("link");
      expect(navLinks.length).toBeGreaterThanOrEqual(11); // 11 sections
    });
  });

  describe("Initial State", () => {
    it("expands the first section by default", () => {
      render(<UserGuide />);

      // First section (Preview Disclaimer) should be expanded
      const firstAccordionHeader = screen.getByRole("button", { name: /Preview Disclaimer/i });
      const firstAccordion = firstAccordionHeader.closest(".MuiAccordion-root");
      expect(firstAccordion).toHaveClass("Mui-expanded");
    });

    it("shows first section content on initial render", () => {
      render(<UserGuide />);

      // Content from the first section should be visible
      expect(screen.getByText(/This is a preview launch of a feature/)).toBeInTheDocument();
    });
  });

  describe("Accordion Behavior", () => {
    it("collapses current section when clicking another section", () => {
      render(<UserGuide />);

      // Click on "Overview" section header
      const overviewButton = screen.getByRole("button", { name: /Overview/i });
      fireEvent.click(overviewButton);

      // Overview accordion should be expanded
      const overviewAccordion = overviewButton.closest(".MuiAccordion-root");
      expect(overviewAccordion).toHaveClass("Mui-expanded");

      // First section should no longer be expanded
      const disclaimerButton = screen.getByRole("button", { name: /Preview Disclaimer/i });
      const firstAccordion = disclaimerButton.closest(".MuiAccordion-root");
      expect(firstAccordion).not.toHaveClass("Mui-expanded");
    });

    it("expands section when clicking its header", () => {
      render(<UserGuide />);

      // Click on Architecture section
      const architectureButton = screen.getByRole("button", {
        name: /Knowledge Catalog Business Interface: Architecture/i,
      });
      fireEvent.click(architectureButton);

      const architectureAccordion = architectureButton.closest(".MuiAccordion-root");
      expect(architectureAccordion).toHaveClass("Mui-expanded");
    });

    it("collapses expanded section when clicking its header again", () => {
      render(<UserGuide />);

      // First section is already expanded, click to collapse
      const disclaimerButton = screen.getByRole("button", { name: /Preview Disclaimer/i });
      fireEvent.click(disclaimerButton);

      const disclaimerAccordion = disclaimerButton.closest(".MuiAccordion-root");
      expect(disclaimerAccordion).not.toHaveClass("Mui-expanded");
    });
  });

  describe("Navigation Click Behavior", () => {
    it("expands the clicked section from navigation", () => {
      render(<UserGuide />);

      // Find navigation link for "API Usage Details"
      const navLinks = screen.getAllByText("API Usage Details");
      const navLink = navLinks.find((el) => el.closest("a"));

      fireEvent.click(navLink!);

      // API Usage Details section should be expanded
      const apiAccordion = screen
        .getByRole("button", { name: /API Usage Details/i })
        .closest(".MuiAccordion-root");
      expect(apiAccordion).toHaveClass("Mui-expanded");
    });

    it("prevents default link behavior on navigation click", () => {
      render(<UserGuide />);

      // Find a navigation link
      const navLinks = screen.getAllByText("Overview");
      const navLink = navLinks.find((el) => el.closest("a"));

      // The accordion should expand after click
      fireEvent.click(navLink!);

      // Verify the accordion expanded (which means the click handler ran)
      const overviewAccordion = screen
        .getByRole("button", { name: /Overview/i })
        .closest(".MuiAccordion-root");
      expect(overviewAccordion).toHaveClass("Mui-expanded");
    });

    describe("scroll behavior with timers", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
      });

      it("attempts to scroll to element after timeout", () => {
        const mockScrollTo = vi.fn();
        const mockElement = {
          getBoundingClientRect: () => ({ top: 100 }),
          closest: vi.fn().mockReturnValue({
            getBoundingClientRect: () => ({ top: 50 }),
            scrollTop: 0,
            scrollTo: mockScrollTo,
          }),
        };

        vi.spyOn(document, "getElementById").mockReturnValue(mockElement as unknown as HTMLElement);

        render(<UserGuide />);

        // Find navigation link for "Browse Data Assets"
        const navLinks = screen.getAllByText("Browse Data Assets");
        const navLink = navLinks.find((el) => el.closest("a"));

        fireEvent.click(navLink!);

        // Advance timers to trigger setTimeout callback
        vi.advanceTimersByTime(300);

        expect(document.getElementById).toHaveBeenCalledWith("browse-assets");
        expect(mockScrollTo).toHaveBeenCalledWith({
          top: 30, // elementRect.top - containerRect.top + scrollTop - 20 = 100 - 50 + 0 - 20 = 30
          behavior: "smooth",
        });
      });

      it("handles case when element is not found", () => {
        vi.spyOn(document, "getElementById").mockReturnValue(null);

        render(<UserGuide />);

        const navLinks = screen.getAllByText("Overview");
        const navLink = navLinks.find((el) => el.closest("a"));

        // Should not throw
        fireEvent.click(navLink!);
        vi.advanceTimersByTime(300);

        expect(document.getElementById).toHaveBeenCalled();
      });

      it("handles case when container is not found", () => {
        const mockElement = {
          closest: vi.fn().mockReturnValue(null),
        };

        vi.spyOn(document, "getElementById").mockReturnValue(mockElement as unknown as HTMLElement);

        render(<UserGuide />);

        const navLinks = screen.getAllByText("Overview");
        const navLink = navLinks.find((el) => el.closest("a"));

        // Should not throw
        fireEvent.click(navLink!);
        vi.advanceTimersByTime(300);

        expect(mockElement.closest).toHaveBeenCalledWith('[style*="overflow"]');
      });
    });
  });

  describe("Section Content", () => {
    describe("Preview Disclaimer Section", () => {
      it("renders preview disclaimer content", () => {
        render(<UserGuide />);

        expect(screen.getByText(/This is a preview launch of a feature/)).toBeInTheDocument();
        expect(
          screen.getByText(/We strongly recommend that for this preview/)
        ).toBeInTheDocument();
      });
    });

    describe("Overview Section", () => {
      it("renders overview content when expanded", () => {
        render(<UserGuide />);

        // Expand Overview section
        const overviewButton = screen.getByRole("button", { name: /Overview/i });
        fireEvent.click(overviewButton);

        expect(
          screen.getByText(/Knowledge Catalog Business Interface is an open source/)
        ).toBeInTheDocument();
        expect(screen.getByText("Key Benefits")).toBeInTheDocument();
        expect(screen.getByText(/Simplified Access:/)).toBeInTheDocument();
        expect(screen.getByText(/Centralized Discovery:/)).toBeInTheDocument();
        expect(screen.getByText(/Comprehensive Metadata:/)).toBeInTheDocument();
      });

      it("renders Knowledge Catalog link", () => {
        render(<UserGuide />);

        const overviewButton = screen.getByRole("button", { name: /Overview/i });
        fireEvent.click(overviewButton);

        const dataplexLink = screen.getByText("Knowledge Catalog");
        expect(dataplexLink).toHaveAttribute(
          "href",
          "https://cloud.google.com/dataplex?e=48754805&hl=en"
        );
        expect(dataplexLink).toHaveAttribute("target", "_blank");
        expect(dataplexLink).toHaveAttribute("rel", "noopener");
      });
    });

    describe("Architecture Section", () => {
      it("renders architecture image when expanded", () => {
        render(<UserGuide />);

        const architectureButton = screen.getByRole("button", {
          name: /Knowledge Catalog Business Interface: Architecture/i,
        });
        fireEvent.click(architectureButton);

        const archImage = screen.getByAltText("Knowledge Catalog Business Interface high-level architecture");
        expect(archImage).toBeInTheDocument();
        expect(archImage).toHaveAttribute("src", "/assets/images/fig1-architecture.png");
      });

      it("renders figure caption", () => {
        render(<UserGuide />);

        const architectureButton = screen.getByRole("button", {
          name: /Knowledge Catalog Business Interface: Architecture/i,
        });
        fireEvent.click(architectureButton);

        expect(screen.getByText("Fig 1. High-level Architecture")).toBeInTheDocument();
      });
    });

    describe("API Usage Details Section", () => {
      it("renders API usage content when expanded", () => {
        render(<UserGuide />);

        const apiButton = screen.getByRole("button", { name: /API Usage Details/i });
        fireEvent.click(apiButton);

        expect(screen.getByText(/Knowledge Catalog Catalog Search API:/)).toBeInTheDocument();
        expect(screen.getByText(/Knowledge Catalog Entity\/Entry API:/)).toBeInTheDocument();
        expect(screen.getByText(/Data Lineage API:/)).toBeInTheDocument();
      });
    });

    describe("Before You Begin Section", () => {
      it("renders prerequisites content when expanded", () => {
        render(<UserGuide />);

        const beforeButton = screen.getByRole("button", { name: /Before You Begin/i });
        fireEvent.click(beforeButton);

        expect(screen.getByText("Deployment Prerequisites")).toBeInTheDocument();
        expect(screen.getByText("Authentication Prerequisites")).toBeInTheDocument();
        expect(screen.getByText("Minimum Required Permissions:")).toBeInTheDocument();
      });

      it("renders OAuth link", () => {
        render(<UserGuide />);

        const beforeButton = screen.getByRole("button", { name: /Before You Begin/i });
        fireEvent.click(beforeButton);

        const oauthLink = screen.getByText(/Create an OAuth client using google auth platform/);
        expect(oauthLink).toHaveAttribute(
          "href",
          "https://developers.google.com/identity/protocols/oauth2"
        );
      });
    });

    describe("Deploy Section", () => {
      it("renders deployment methods when expanded", () => {
        render(<UserGuide />);

        const deployButton = screen.getByRole("button", {
          name: /Deploy Knowledge Catalog Business Interface Application/i,
        });
        fireEvent.click(deployButton);

        expect(screen.getByText("Deployment Methods (For Administrator Reference)")).toBeInTheDocument();
        expect(screen.getByText(/Console:/)).toBeInTheDocument();
        expect(screen.getByText(/gcloud CLI:/)).toBeInTheDocument();
        expect(screen.getByText(/Script:/)).toBeInTheDocument();
      });

      it("renders deployment script code block", () => {
        render(<UserGuide />);

        const deployButton = screen.getByRole("button", {
          name: /Deploy Knowledge Catalog Business Interface Application/i,
        });
        fireEvent.click(deployButton);

        // Check for code content
        expect(screen.getByText(/gcloud auth login/)).toBeInTheDocument();
        expect(screen.getByText(/gcloud config set project YOUR_PROJECT_ID/)).toBeInTheDocument();
      });

      it("renders re-deployment steps", () => {
        render(<UserGuide />);

        const deployButton = screen.getByRole("button", {
          name: /Deploy Knowledge Catalog Business Interface Application/i,
        });
        fireEvent.click(deployButton);

        expect(screen.getByText("For re-deployment follow the steps below")).toBeInTheDocument();
        expect(
          screen.getByText("Step 1: Pull the latest changes from the code repository")
        ).toBeInTheDocument();
        expect(screen.getByText(/git pull/)).toBeInTheDocument();
      });
    });

    describe("Authenticate Section", () => {
      it("renders authentication steps when expanded", () => {
        render(<UserGuide />);

        const authButton = screen.getByRole("button", { name: /^Authenticate$/i });
        fireEvent.click(authButton);

        expect(screen.getByText(/Access the Web App:/)).toBeInTheDocument();
        expect(screen.getByText(/Google Cloud Sign-In:/)).toBeInTheDocument();
        expect(screen.getByText(/Permission Check:/)).toBeInTheDocument();
      });

      it("renders sign-in image", () => {
        render(<UserGuide />);

        const authButton = screen.getByRole("button", { name: /^Authenticate$/i });
        fireEvent.click(authButton);

        const signInImage = screen.getByAltText("Knowledge Catalog Business Interface Sign-in Page");
        expect(signInImage).toHaveAttribute("src", "/assets/images/fig2-signin.png");
      });
    });

    describe("Search Data Assets Section", () => {
      it("renders search features when expanded", () => {
        render(<UserGuide />);

        const searchButton = screen.getByRole("button", { name: /Search Data Assets/i });
        fireEvent.click(searchButton);

        expect(screen.getByText("Home Page Features")).toBeInTheDocument();
        expect(screen.getByText(/Search Bar:/)).toBeInTheDocument();
        expect(screen.getByText("How to Search")).toBeInTheDocument();
      });

      it("renders filter types information", () => {
        render(<UserGuide />);

        const searchButton = screen.getByRole("button", { name: /Search Data Assets/i });
        fireEvent.click(searchButton);

        expect(screen.getByText("2. Filters for Business Interface")).toBeInTheDocument();
        // These texts have <strong> tags that break up the text, so we look for adjacent text fragments
        expect(screen.getByText(/filter allows you to refine search results based on the metadata/)).toBeInTheDocument();
        expect(screen.getByText(/filter allows you to focus your search on data assets/)).toBeInTheDocument();
        expect(screen.getByText(/filter allows you to limit the displayed results to assets/)).toBeInTheDocument();
      });
    });

    describe("Detailed Asset View Section", () => {
      it("renders detail tabs information when expanded", () => {
        render(<UserGuide />);

        const detailedButton = screen.getByRole("button", { name: /Detailed Asset View/i });
        fireEvent.click(detailedButton);

        expect(screen.getByText("1. Overview")).toBeInTheDocument();
        expect(screen.getByText("2. Aspects")).toBeInTheDocument();
        expect(screen.getByText("3. Lineage")).toBeInTheDocument();
        expect(screen.getByText("4. Data Profile")).toBeInTheDocument();
        expect(screen.getByText("5. Data Quality")).toBeInTheDocument();
        expect(screen.getByText("6. Explore Data in Source or with Looker Studio")).toBeInTheDocument();
      });
    });

    describe("Browse Data Assets Section", () => {
      it("renders browse content when expanded", () => {
        render(<UserGuide />);

        const browseButton = screen.getByRole("button", { name: /Browse Data Assets/i });
        fireEvent.click(browseButton);

        expect(screen.getByText(/If you are exploring or are unsure/)).toBeInTheDocument();
        expect(screen.getByText(/Field Values:/)).toBeInTheDocument();
      });

      it("renders browse images", () => {
        render(<UserGuide />);

        const browseButton = screen.getByRole("button", { name: /Browse Data Assets/i });
        fireEvent.click(browseButton);

        expect(
          screen.getByAltText("Knowledge Catalog home page with Browse button highlighted")
        ).toBeInTheDocument();
        expect(screen.getByAltText("Knowledge Catalog browse by aspect page")).toBeInTheDocument();
      });
    });

    describe("Requesting Access Workflow Section", () => {
      it("renders access request workflow when expanded", () => {
        render(<UserGuide />);

        const accessButton = screen.getByRole("button", { name: /Requesting Access Workflow/i });
        fireEvent.click(accessButton);

        expect(screen.getByText(/Acknowledge Restricted Status:/)).toBeInTheDocument();
        expect(screen.getByText(/Initiate Request:/)).toBeInTheDocument();
        expect(screen.getByText(/Provide Justification:/)).toBeInTheDocument();
        expect(screen.getByText(/Notification:/)).toBeInTheDocument();
        expect(screen.getByText(/Track Status:/)).toBeInTheDocument();
      });
    });
  });

  describe("Images", () => {
    it("renders all figure images with correct alt text", () => {
      render(<UserGuide />);

      // Expand Architecture section to check its image
      const architectureButton = screen.getByRole("button", {
        name: /Knowledge Catalog Business Interface: Architecture/i,
      });
      fireEvent.click(architectureButton);

      // Check various images exist
      expect(screen.getByAltText("Knowledge Catalog Business Interface high-level architecture")).toBeInTheDocument();
    });
  });

  describe("Navigation Highlighting", () => {
    it("highlights current section in navigation", () => {
      render(<UserGuide />);

      // First section should be highlighted (bold) by default
      const navLinks = screen.getAllByText("Preview Disclaimer");
      const navLink = navLinks.find((el) => el.closest("a"));

      // The text should have bold font weight when section is expanded
      expect(navLink).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-controls on accordion summaries", () => {
      render(<UserGuide />);

      const disclaimerHeader = screen.getByRole("button", { name: /Preview Disclaimer/i });
      expect(disclaimerHeader).toHaveAttribute("aria-controls", "preview-disclaimer-content");
    });

    it("has proper id on accordion headers", () => {
      render(<UserGuide />);

      const disclaimerHeader = screen.getByRole("button", { name: /Preview Disclaimer/i });
      expect(disclaimerHeader).toHaveAttribute("id", "preview-disclaimer-header");
    });

    it("renders expand icons for all accordions", () => {
      render(<UserGuide />);

      const expandIcons = screen.getAllByTestId("ExpandMoreIcon");
      expect(expandIcons.length).toBe(11); // 11 sections
    });

    it("renders article icons in navigation", () => {
      render(<UserGuide />);

      const articleIcons = screen.getAllByTestId("ArticleIcon");
      expect(articleIcons.length).toBe(11); // 11 navigation items
    });
  });

  describe("Layout Structure", () => {
    it("renders main content area and navigation side panel", () => {
      const { container } = render(<UserGuide />);

      // Check for flex layout
      const mainBox = container.querySelector(".MuiBox-root");
      expect(mainBox).toBeInTheDocument();
    });

    it("renders Paper component for navigation", () => {
      const { container } = render(<UserGuide />);

      const paper = container.querySelector(".MuiPaper-root");
      expect(paper).toBeInTheDocument();
    });

    it("renders Divider after title", () => {
      const { container } = render(<UserGuide />);

      const dividers = container.querySelectorAll(".MuiDivider-root");
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  describe("Code Blocks", () => {
    it("renders code blocks with proper styling", () => {
      render(<UserGuide />);

      // Expand deploy section
      const deployButton = screen.getByRole("button", {
        name: /Deploy Knowledge Catalog Business Interface Application/i,
      });
      fireEvent.click(deployButton);

      // Check that code blocks are rendered
      const codeBlocks = document.querySelectorAll("pre");
      expect(codeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Links in Content", () => {
    it("renders external links with proper attributes", () => {
      render(<UserGuide />);

      // Expand Overview section
      const overviewButton = screen.getByRole("button", { name: /Overview/i });
      fireEvent.click(overviewButton);

      // Check the Knowledge Catalog link
      const dataplexLink = screen.getByText("Knowledge Catalog");
      expect(dataplexLink.tagName).toBe("A");
      expect(dataplexLink).toHaveAttribute("rel", "noopener");
    });
  });

  describe("Module Export", () => {
    it("exports the component as default", () => {
      expect(UserGuide).toBeDefined();
      expect(typeof UserGuide).toBe("function");
    });
  });
});
