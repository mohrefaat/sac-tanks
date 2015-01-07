using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace TerrainEditor
{
    public partial class Form1 : Form
    {
        List<DraggablePoint> points = new List<DraggablePoint>();
        Bitmap groundTex = new Bitmap(@"Images/ground7.jpg");
        Bitmap grassTex = new Bitmap(@"Images/grass.png");
        PointF[] groundPoints;

        bool placingPoint = false;
        PointF? placedPoint = null;

        bool editMode = true;

        public Form1()
        {
            InitializeComponent();

            DraggablePoint.PointDragged += OnPointDragged;

            groundTex = ResizeImage(groundTex, new Size(128, 128));
            grassTex = ResizeImage(grassTex, new Size(30, 30));

            points.Add(new DraggablePoint(canvas, new RectangleF(0, 400, 10, 10), Color.Red));
            points.Add(new DraggablePoint(canvas, new RectangleF(canvas.Width, 400, 10, 10), Color.Red));

            GenerateGroundPolygon();
        }

        void GenerateGroundPolygon()
        {
            groundPoints = new PointF[points.Count + 2];
            groundPoints[0] = new PointF(points[0].x, canvas.Height);

            for (int i = 1; i <= points.Count; i++)
                groundPoints[i] = points[i - 1].Point;

            groundPoints[points.Count + 1] = new PointF(points[points.Count - 1].x, canvas.Height);
        }

        void OnPointDragged(object sender, EventArgs e)
        {
            GenerateGroundPolygon();
            canvas.Invalidate();
        }

        private void canvas_Paint(object sender, PaintEventArgs e)
        {
            Graphics gfx = e.Graphics;
            gfx.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

            Pen p = new Pen(Color.Black, 2);

            //Draw background
            gfx.FillRectangle(new LinearGradientBrush(this.ClientRectangle, Color.WhiteSmoke, Color.SkyBlue, -90f), canvas.ClientRectangle);

            //Draw Ground
            TextureBrush groundBrush = new TextureBrush(groundTex);//, new Rectangle(0,0,300,300));
            gfx.FillPolygon(groundBrush, groundPoints);

            //Draw grass
            groundBrush = new TextureBrush(grassTex);

            for (int i = 1; i < points.Count; i++)
            {
                float angle = (float)Math.Atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
                float length = GetEuclideanDistance(points[i].Point, points[i - 1].Point);

                Matrix m = new Matrix();
                m.RotateAt(angle * 180 / (float)Math.PI, points[i - 1].Point);
                m.Translate(points[i - 1].x, points[i - 1].y);
                gfx.Transform = m;


                gfx.FillRectangle(groundBrush, 0, -30, length, 30);
                //gfx.DrawRectangle(p, points[i - 1].x, points[i - 1].y - 30, length, 30);
            }
            gfx.ResetTransform();

            if (editMode)
            {
                //Draw lines
                for (int i = 1; i < points.Count; i++)
                    gfx.DrawLine(p, points[i].Point, points[i - 1].Point);


                //Draw points
                foreach (DraggablePoint dp in points)
                    dp.Paint(gfx);
            }

            //Draw new point
            p.Color = Color.Red;
            if (placingPoint && placedPoint.HasValue)
                gfx.DrawEllipse(p, placedPoint.Value.X - 4, placedPoint.Value.Y - 4, 8, 8);
        }

        float getSlope(float x1, float y1, float x2, float y2)
        {
            float dx = x1 - x2;
            float dy = y1 - y2;

            return dx == 0 ? dy / canvas.Width : dy / dx;
        }

        float getLineShift(float m, float x, float y)
        {
            return -m * x + y;
        }

        PointF? GetClosestPointOnLine(PointF p1, PointF p2, PointF target)
        {
            float m = getSlope(p1.X, p1.Y, p2.X, p2.Y);
            float b = getLineShift(m, p1.X, p1.Y);

            float closestX = (target.X + m * target.Y - m * b) / (m * m + 1);

            if (closestX < p1.X || closestX > p2.X)
                return null;

            float closestY = closestX * m + b;

            return new PointF(closestX, closestY);
        }

        float GetEuclideanDistance(PointF p1, PointF p2)
        {
            float dx = p2.X - p1.X;
            float dy = p2.Y - p1.Y;

            return (float)Math.Sqrt(dx * dx + dy * dy);
        }

        Bitmap ResizeImage(Bitmap imgToResize, Size size)
        {
            Bitmap b = new Bitmap(size.Width, size.Height);
            using (Graphics g = Graphics.FromImage((Image)b))
            {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                using (ImageAttributes wrapMode = new ImageAttributes())
                {
                    wrapMode.SetWrapMode(WrapMode.TileFlipXY);
                    g.DrawImage(imgToResize, new Rectangle(0, 0, size.Width, size.Height), 0, 0, imgToResize.Width, imgToResize.Height, GraphicsUnit.Pixel, wrapMode);
                }
            }
            return b;
        }

        private void AddPoint()
        {
            placingPoint = false;
            if (placedPoint.HasValue)
            {
                points.Add(new DraggablePoint(canvas, new RectangleF(placedPoint.Value.X, placedPoint.Value.Y, 8, 8), Color.Red));
                points = points.OrderBy(x => x.x).ToList();
                canvas.Invalidate();
            }
        }

        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            switch (e.KeyCode)
            {
                case Keys.E:
                    if (placingPoint)
                        AddPoint();
                    else
                        placingPoint = true;
                    break;

                case Keys.Escape:
                    placingPoint = false;
                    canvas.Invalidate();
                    break;

                case Keys.Space:
                    editMode = !editMode;
                    placingPoint = false;
                    canvas.Invalidate();
                    break;

                case Keys.R:
                    string strRes = "";
                    DialogResult res = InputBox("Enter world width", "Input number", ref strRes);

                    int newWidth = 0;
                    if (res == System.Windows.Forms.DialogResult.OK && Int32.TryParse(strRes, out newWidth))
                    {
                        canvas.Width = newWidth;
                        points.Last().x = newWidth;
                        GenerateGroundPolygon();
                    }
                    break;

                case Keys.S:
                    SaveFileDialog dialog = new SaveFileDialog();
                    dialog.FileName = "map.js";
                    dialog.InitialDirectory = System.IO.Directory.GetCurrentDirectory() + "/Maps";

                    res = dialog.ShowDialog();
                    if (res != System.Windows.Forms.DialogResult.OK)
                        break;

                    System.IO.File.WriteAllText(dialog.FileName, CreateSaveData());
                    break;

                case Keys.L:
                    OpenFileDialog loadDialog = new OpenFileDialog();
                    loadDialog.InitialDirectory = System.IO.Directory.GetCurrentDirectory() + "/Maps";

                    res = loadDialog.ShowDialog();
                    if (res != System.Windows.Forms.DialogResult.OK)
                        break;

                    string[] lines = System.IO.File.ReadAllLines(loadDialog.FileName);
                    canvas.Width = int.Parse(lines[0].Replace("var worldWidth = ", "").Replace(";", ""));
                    canvas.Height = int.Parse(lines[1].Replace("var worldHeight = ", "").Replace(";", ""));

                    points.Clear();
                    for (int i = 3; i < lines.Length-1; i++)
                    {
                        string[] parts = lines[i].Replace("var map = [", "").Replace("];", "").Split(',');
                        points.Add(new DraggablePoint(canvas, new RectangleF((float)Math.Floor(float.Parse(parts[0])), (float)Math.Floor(float.Parse(parts[1])), i == 3 ? 10 : 8, i == lines.Length - 2 ? 10 : 8), Color.Red));
                        GenerateGroundPolygon();
                        canvas.Invalidate();
                    }
                    break;
            }

        }

        private void Form1_Resize(object sender, EventArgs e)
        {
            GenerateGroundPolygon();
            canvas.Invalidate();
        }

        private void canvas_MouseMove(object sender, MouseEventArgs e)
        {
            //Calculate new point
            if (placingPoint)
            {
                placedPoint = null;
                float minDist = float.MaxValue;

                for (int i = 1; i < points.Count; i++)
                {
                    PointF? closest = GetClosestPointOnLine(points[i - 1].Point, points[i].Point, e.Location);
                    if (closest.HasValue)
                    {
                        float dist = GetEuclideanDistance(e.Location, closest.Value);
                        if (dist < minDist)
                        {
                            minDist = dist;
                            placedPoint = closest;
                        }
                    }
                }
                canvas.Invalidate();
            }
        }

        private void canvas_Click(object sender, EventArgs e)
        {
            if (placingPoint)
                AddPoint();
        }

        public static DialogResult InputBox(string title, string promptText, ref string value)
        {
            Form form = new Form();
            Label label = new Label();
            TextBox textBox = new TextBox();
            Button buttonOk = new Button();
            Button buttonCancel = new Button();

            form.Text = title;
            label.Text = promptText;
            textBox.Text = value;

            buttonOk.Text = "OK";
            buttonCancel.Text = "Cancel";
            buttonOk.DialogResult = DialogResult.OK;
            buttonCancel.DialogResult = DialogResult.Cancel;

            label.SetBounds(9, 20, 372, 13);
            textBox.SetBounds(12, 36, 372, 20);
            buttonOk.SetBounds(228, 72, 75, 23);
            buttonCancel.SetBounds(309, 72, 75, 23);

            label.AutoSize = true;
            textBox.Anchor = textBox.Anchor | AnchorStyles.Right;
            buttonOk.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;
            buttonCancel.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;

            form.ClientSize = new Size(396, 107);
            form.Controls.AddRange(new Control[] { label, textBox, buttonOk, buttonCancel });
            form.ClientSize = new Size(Math.Max(300, label.Right + 10), form.ClientSize.Height);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.MinimizeBox = false;
            form.MaximizeBox = false;
            form.AcceptButton = buttonOk;
            form.CancelButton = buttonCancel;

            DialogResult dialogResult = form.ShowDialog();
            value = textBox.Text;
            return dialogResult;
        }

        public string CreateSaveData()
        {
            string buffer = string.Empty;

            buffer = "var worldWidth = " + canvas.Width + ";\n";
            buffer += "var worldHeight = " + canvas.Height + ";\n";
            buffer += "var map = [";

            for (int i = 0; i < groundPoints.Length; i++)
            {
                buffer += groundPoints[i].X + ", " + groundPoints[i].Y;

                if (i < groundPoints.Length - 1)
                    buffer += ",\n";
            }

            buffer += "];";

            return buffer;
        }
    }
}
