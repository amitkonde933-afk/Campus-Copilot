$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public class IconGenerator {
    public static void GenerateIcons(string outputDir) {
        if (!Directory.Exists(outputDir)) {
            Directory.CreateDirectory(outputDir);
        }

        int[] sizes = new int[] { 16, 32, 48, 128 };
        foreach (int size in sizes) {
            using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    // Rounded rectangle squircle
                    float radius = size * 0.22f;
                    float diameter = radius * 2f;
                    RectangleF rect = new RectangleF(0.5f, 0.5f, size - 1f, size - 1f);

                    using (GraphicsPath path = new GraphicsPath()) {
                        path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
                        path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
                        path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
                        path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
                        path.CloseFigure();

                        // Vibrant Cyan (#38bdf8) to Indigo (#6366f1) Gradient
                        using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                            rect,
                            Color.FromArgb(56, 189, 248),
                            Color.FromArgb(99, 102, 241),
                            45f)) {
                            g.FillPath(bgBrush, path);
                        }

                        // Subtle outer border glow
                        using (Pen borderPen = new Pen(Color.FromArgb(160, 255, 255, 255), Math.Max(1f, size * 0.03f))) {
                            g.DrawPath(borderPen, path);
                        }
                    }

                    // Foreground Glyph: Graduation Cap & AI Sparkle
                    using (Brush whiteBrush = new SolidBrush(Color.White))
                    using (Pen whitePen = new Pen(Color.White, Math.Max(1.2f, size * 0.07f))) {
                        whitePen.StartCap = LineCap.Round;
                        whitePen.EndCap = LineCap.Round;
                        whitePen.LineJoin = LineJoin.Round;

                        // Graduation Cap Diamond Top
                        PointF topPoint = new PointF(size * 0.50f, size * 0.26f);
                        PointF rightPoint = new PointF(size * 0.82f, size * 0.44f);
                        PointF bottomPoint = new PointF(size * 0.50f, size * 0.62f);
                        PointF leftPoint = new PointF(size * 0.18f, size * 0.44f);

                        PointF[] capPolygon = new PointF[] { topPoint, rightPoint, bottomPoint, leftPoint };
                        g.FillPolygon(whiteBrush, capPolygon);

                        // Cap Base / Skullcap
                        using (GraphicsPath baseCap = new GraphicsPath()) {
                            baseCap.AddArc(size * 0.30f, size * 0.48f, size * 0.40f, size * 0.32f, 0, 180);
                            g.FillPath(whiteBrush, baseCap);
                        }

                        // Tassel hanging to the right
                        PointF tasselStart = new PointF(size * 0.50f, size * 0.44f);
                        PointF tasselCorner = new PointF(size * 0.84f, size * 0.52f);
                        PointF tasselEnd = new PointF(size * 0.84f, size * 0.72f);
                        g.DrawLines(whitePen, new PointF[] { tasselStart, tasselCorner, tasselEnd });

                        // AI Sparkle Star (top right)
                        if (size >= 32) {
                            float starCenterX = size * 0.78f;
                            float starCenterY = size * 0.24f;
                            float starRadius = size * 0.12f;

                            using (GraphicsPath star = new GraphicsPath()) {
                                star.AddLine(starCenterX, starCenterY - starRadius, starCenterX + starRadius * 0.28f, starCenterY - starRadius * 0.28f);
                                star.AddLine(starCenterX + starRadius, starCenterY, starCenterX + starRadius * 0.28f, starCenterY + starRadius * 0.28f);
                                star.AddLine(starCenterX, starCenterY + starRadius, starCenterX - starRadius * 0.28f, starCenterY + starRadius * 0.28f);
                                star.AddLine(starCenterX - starRadius, starCenterY, starCenterX - starRadius * 0.28f, starCenterY - starRadius * 0.28f);
                                star.CloseFigure();

                                using (Brush starBrush = new SolidBrush(Color.FromArgb(255, 255, 255, 230))) {
                                    g.FillPath(starBrush, star);
                                }
                            }
                        }
                    }
                }
                string filePath = Path.Combine(outputDir, "icon-" + size + ".png");
                bmp.Save(filePath, ImageFormat.Png);
                Console.WriteLine("Saved: " + filePath);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing
[IconGenerator]::GenerateIcons((Join-Path (Get-Location) "icons"))
