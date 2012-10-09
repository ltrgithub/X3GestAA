﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.Data;
using System.Linq;
using System.Text;
using System.IO;
using System.Windows.Forms;
using System.Web.Script.Serialization;

using Microsoft.Office.Interop.Word;
using Microsoft.Office.Core;

namespace WordAddIn
{
    public partial class SyracuseTemplatePane : UserControl
    {
        public SyracuseTemplatePane()
        {
            InitializeComponent();

            this.SizeChanged += new EventHandler(SyracuseTemplatePane_SizeChanged);
            this.treeViewFields.NodeMouseDoubleClick += new TreeNodeMouseClickEventHandler(SyracuseTemplatePane_NodeMouseDoubleClick);
            this.treeViewFields.ImageList = ReportingFieldUtil.getTypeImageList();
        }

        public void SyracuseTemplatePane_SizeChanged(Object sender, EventArgs e)
        {
            treeViewFields.Size = this.Size;
        }

        public void SyracuseTemplatePane_NodeMouseDoubleClick(Object sender, TreeNodeMouseClickEventArgs e)
        {
            Document doc = Globals.WordAddIn.Application.ActiveDocument;
            Boolean tog = false;

            try
            {
                FieldTreeNode n = (FieldTreeNode)e.Node;
                Selection s = Globals.WordAddIn.Application.Selection;
                Range cursor = s.Range;
                cursor.Collapse(WdCollapseDirection.wdCollapseEnd);


                if (doc.FormsDesign)
                {
                    doc.ToggleFormsDesign();
                    tog = true;
                }

                ContentControl c = ReportingUtils.createContentControl(doc, cursor, n.item, n.itemParent);
                cursor = c.Range;
                cursor.Collapse(WdCollapseDirection.wdCollapseEnd);
                cursor.Select();

                moveInTable(doc, cursor);
            }
            catch (Exception ee)
            {
                MessageBox.Show(ee.Message + ":" + ee.StackTrace);
            }
            finally
            {
                if (tog)
                {
                    doc.ToggleFormsDesign();
                }
            }
        }
        public void moveInTable(Document doc, Range r)
        {
            if (r.Information[WdInformation.wdWithInTable] != true)
            {
                return;
            }
            try
            {
                int row = r.Cells[1].RowIndex;
                int col = r.Cells[1].ColumnIndex;
                Table t = r.Tables[1];
                Cell c = t.Cell(row, col);
                r = c.Range;
                r.Collapse(WdCollapseDirection.wdCollapseEnd);
                r.Select();
            }
            catch (Exception) { };
        }
        
        public void clear()
        {
            treeViewFields.Nodes.Clear();
        }

        public void showFields(string layoutData)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutData);

            Object[] boxes = (Object[])layout["layout"];
            foreach (Object o in boxes)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    String title = "<unknown>";
                    if (box.ContainsKey("$title"))
                    {
                        title = box["$title"].ToString();
                    }

                    FieldTreeNode node;
                    if (box.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)box["$items"];
                        String container = "box";

                        if (box.ContainsKey("$container"))
                        {
                            container = box["$container"].ToString();
                        }

                        node = new FieldTreeNode(title);
                        if (container.Equals("table"))
                        {
                            node.itemParent = box["$bind"].ToString();
                            node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.TABLE);
                        }
                        else
                        {
                            node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.BOX);
                        }
                        
                        
                        node.SelectedImageIndex = node.ImageIndex;

                        foreach (KeyValuePair<String, object> i in items)
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                            
                            String hidden = item["$hidden"].ToString();
                            String ctitle = item["$title"].ToString();
                            String type = item["$type"].ToString();
                            String bind = item["$bind"].ToString();
                            
                            ReportingFieldTypes tft = ReportingFieldUtil.getType(type);
                            
                            FieldTreeNode child = new FieldTreeNode(ctitle, item);
                            child.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(tft);
                            child.SelectedImageIndex = child.ImageIndex;

                            node.Nodes.Add(child);
                        }

                        treeViewFields.Nodes.Add(node);
                    }
                }
                catch (Exception) { }
            }

            treeViewFields.ExpandAll();
        }
    }

    public class FieldTreeNode : TreeNode
    {
        public Dictionary<String, Object> item;
        public String itemParent;

        public FieldTreeNode(String title)
            : base(title)
        {
        }
        public FieldTreeNode(String title, Dictionary<String, Object> item)
            : base(title)
        {
            this.item = item;
        }
    };


}
