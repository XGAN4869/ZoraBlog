## binding 用于接收前端请求
后端会定义一个专门的**请求结构体（Request DTO）**
```go
// 用于接收前端登录请求
type LoginReq struct {
    Username string `json:"username" binding:"required"` // 前端必传
    Password string `json:"password" binding:"required"` // 前端必传
}
```
Gin 的 Controller/Handler 中
```go
var req LoginReq
if err := c.ShouldBindJSON(&req); err != nil {
    // 如果没传 username 或 password，这里直接报错拦截
    c.JSON(400, gin.H{"error": err.Error()})
    return
}
```

## 请求图
```drawio
<mxfile>
  <diagram id="Ga3APHdk0pBgOWX9C5v6" name="第 1 页">
    <mxGraphModel dx="1492" dy="733" grid="1" gridSize="10" guides="1" tooltips="0" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <UserObject label="" mermaidData="{&#xa;  &quot;data&quot;: &quot;graph TD\r\n    A[Vue 前端] --&gt;|1. 发送 POST /login 请求| B(Router 路由层)\r\n    B --&gt;|2. 根据URL分发| C(Handler / Controller 控制层)\r\n    C --&gt;|3. ShouldBindJSON 参数绑定与校验| D(Service 业务逻辑层)\r\n    D --&gt;|4. 验证密码、处理登录业务、生成 JWT| E(Repository / DAO 数据访问层)\r\n    E --&gt;|5. 执行 SQL 查询/操作| F[(MySQL 数据库)]\r\n\r\n    F -.-&gt;|6. 返回数据集| E\r\n    E -.-&gt;|7. 返回实体对象/ORM结果| D\r\n    D -.-&gt;|8. 返回 JWT Token / 业务结果| C\r\n    C -.-&gt;|9. 返回 JSON 响应| A\r\n\r\n    classDef frontend fill:#42b883,color:#fff,stroke:#333,stroke-width:2px;\r\n    classDef router fill:#f9ca24,color:#333,stroke:#333,stroke-width:2px;\r\n    classDef handler fill:#6ab04c,color:#fff,stroke:#333,stroke-width:2px;\r\n    classDef service fill:#eb4d4b,color:#fff,stroke:#333,stroke-width:2px;\r\n    classDef repo fill:#4834d4,color:#fff,stroke:#333,stroke-width:2px;\r\n    classDef db fill:#130f40,color:#fff,stroke:#333,stroke-width:2px;\r\n\r\n    class A frontend;\r\n    class B router;\r\n    class C handler;\r\n    class D service;\r\n    class E repo;\r\n    class F db;&quot;,&#xa;  &quot;config&quot;: null&#xa;}" id="17">
          <mxCell connectable="0" parent="1" style="group;transparentBounds=1;editIcon=1;lockedGroup=0;groupPadding=10;" vertex="1">
            <mxGeometry as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="Vue 前端" mermaidId="n:A" mermaidBaseStyle="html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#42b883;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="Vue 前端" id="2">
          <mxCell parent="17" style="html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#42b883;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="54" width="123" x="96" y="10" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="Router 路由层" mermaidId="n:B" mermaidBaseStyle="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#f9ca24;strokeColor=#333;fontColor=#333;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="Router 路由层" id="3">
          <mxCell parent="17" style="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#f9ca24;strokeColor=#333;fontColor=#333;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="54" width="130" x="10" y="133" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="Handler / Controller 控制层" mermaidId="n:C" mermaidBaseStyle="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#6ab04c;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="Handler / Controller 控制层" id="4">
          <mxCell parent="17" style="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#6ab04c;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="54" width="229" x="43" y="256" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="Service 业务逻辑层" mermaidId="n:D" mermaidBaseStyle="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#eb4d4b;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="Service 业务逻辑层" id="5">
          <mxCell parent="17" style="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#eb4d4b;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="54" width="167" x="74" y="379" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="Repository / DAO 数据访问层" mermaidId="n:E" mermaidBaseStyle="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#4834d4;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="Repository / DAO 数据访问层" id="6">
          <mxCell parent="17" style="rounded=1;absoluteArcSize=1;arcSize=10;html=1;whiteSpace=wrap;strokeWidth=2;fillColor=#4834d4;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="54" width="238" x="38" y="502" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="MySQL 数据库" mermaidId="n:F" mermaidBaseStyle="html=1;shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;strokeWidth=2;whiteSpace=wrap;fillColor=#130f40;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" mermaidBaseValue="MySQL 数据库" id="7">
          <mxCell parent="17" style="html=1;shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;strokeWidth=2;whiteSpace=wrap;fillColor=#130f40;strokeColor=#333;fontColor=#fff;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontSize=16;" vertex="1">
            <mxGeometry height="67" width="113" x="101" y="625" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="1. 发送 POST /login 请求" mermaidId="e:A-&gt;B#0" mermaidBaseStyle="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.2;exitY=1;entryX=0.5;entryY=0;" mermaidBaseValue="1. 发送 POST /login 请求" id="8">
          <mxCell edge="1" parent="17" source="2" style="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.2;exitY=1;entryX=0.5;entryY=0;" target="3">
            <mxGeometry relative="1" as="geometry">
              <Array as="points">
                <mxPoint x="75" y="99" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="2. 根据URL分发" mermaidId="e:B-&gt;C#0" mermaidBaseStyle="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.5;exitY=1;entryX=0.34;entryY=0;" mermaidBaseValue="2. 根据URL分发" id="9">
          <mxCell edge="1" parent="17" source="3" style="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.5;exitY=1;entryX=0.34;entryY=0;" target="4">
            <mxGeometry relative="1" as="geometry">
              <Array as="points">
                <mxPoint x="75" y="222" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="3. ShouldBindJSON 参数绑定与校验" mermaidId="e:C-&gt;D#0" mermaidBaseStyle="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.5567685589519651;exitY=1;entryX=0.5778443113772456;entryY=0;curved=1;exitX=0.56;exitY=1;entryX=0.58;entryY=0;" mermaidBaseValue="3. ShouldBindJSON 参数绑定与校验" id="10">
          <mxCell edge="1" parent="17" source="4" style="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.56;exitY=1;entryX=0.58;entryY=0;" target="5">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="295" y="345" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="4. 验证密码、处理登录业务、生成 JWT" mermaidId="e:D-&gt;E#0" mermaidBaseStyle="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.5778443113772456;exitY=1;entryX=0.5546218487394958;entryY=0;curved=1;exitX=0.58;exitY=1;entryX=0.55;entryY=0;" mermaidBaseValue="4. 验证密码、处理登录业务、生成 JWT" id="11">
          <mxCell edge="1" parent="17" source="5" style="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.58;exitY=1;entryX=0.55;entryY=0;" target="6">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="308" y="468" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="5. 执行 SQL 查询/操作" mermaidId="e:E-&gt;F#0" mermaidBaseStyle="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.5546218487394958;exitY=1;entryX=0.6150442477876106;entryY=0;curved=1;exitX=0.55;exitY=1;entryX=0.62;entryY=0;" mermaidBaseValue="5. 执行 SQL 查询/操作" id="12">
          <mxCell edge="1" parent="17" source="6" style="curved=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.55;exitY=1;entryX=0.62;entryY=0;" target="7">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="249" y="591" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="6. 返回数据集" mermaidId="e:F-&gt;E#0" mermaidBaseStyle="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.38495575221238937;exitY=0;entryX=0.4453781512605042;entryY=1;curved=1;exitX=0.38;exitY=0;entryX=0.45;entryY=1;" mermaidBaseValue="6. 返回数据集" id="13">
          <mxCell edge="1" parent="17" source="7" style="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.38;exitY=0;entryX=0.45;entryY=1;" target="6">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="96" y="591" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="7. 返回实体对象/ORM结果" mermaidId="e:E-&gt;D#0" mermaidBaseStyle="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.4453781512605042;exitY=0;entryX=0.4221556886227545;entryY=1;curved=1;exitX=0.45;exitY=0;entryX=0.42;entryY=1;" mermaidBaseValue="7. 返回实体对象/ORM结果" id="14">
          <mxCell edge="1" parent="17" source="6" style="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.45;exitY=0;entryX=0.42;entryY=1;" target="5">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="52" y="468" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="8. 返回 JWT Token / 业务结果" mermaidId="e:D-&gt;C#0" mermaidBaseStyle="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.4221556886227545;exitY=0;entryX=0.4432314410480349;entryY=1;curved=1;exitX=0.42;exitY=0;entryX=0.44;entryY=1;" mermaidBaseValue="8. 返回 JWT Token / 业务结果" id="15">
          <mxCell edge="1" parent="17" source="5" style="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.42;exitY=0;entryX=0.44;entryY=1;" target="4">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" />
              <Array as="points">
                <mxPoint x="39" y="345" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="9. 返回 JSON 响应" mermaidId="e:C-&gt;A#0" mermaidBaseStyle="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.66;exitY=0;entryX=0.79;entryY=1;" mermaidBaseValue="9. 返回 JSON 响应" id="16">
          <mxCell edge="1" parent="17" source="4" style="curved=1;dashed=1;dashPattern=2 3;fixDash=1;startArrow=none;endArrow=block;endSize=7;strokeColor=light-dark(#333333,#cccccc);html=1;fontSize=16;labelBackgroundColor=light-dark(#E8E8E88D,#2a2a2a8D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.66;exitY=0;entryX=0.79;entryY=1;" target="2">
            <mxGeometry relative="1" as="geometry">
              <Array as="points">
                <mxPoint x="240" y="222" />
                <mxPoint x="240" y="160" />
                <mxPoint x="240" y="99" />
              </Array>
            </mxGeometry>
          </mxCell>
        </UserObject>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

```

## 666